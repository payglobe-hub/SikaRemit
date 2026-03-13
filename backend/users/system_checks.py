"""
Django system checks for user type validation
Prevents hardcoded user_type values and ensures consistency
"""
from django.core.checks import Error, Warning, register
from django.conf import settings
import re
import os


@register
def check_user_type_hardcoded_values(app_configs, **kwargs):
    """
    Check for hardcoded user_type values in Python files
    Returns errors if hardcoded values are found
    """
    errors = []
    
    # Define old hardcoded values that should not be used
    deprecated_values = ['2', '3']  # Old merchant/customer values
    
    # Get the backend directory path
    backend_path = os.path.join(settings.BASE_DIR, '..')
    if not os.path.exists(backend_path):
        backend_path = settings.BASE_DIR
    
    # Files to check
    files_to_check = []
    for root, dirs, files in os.walk(backend_path):
        # Skip venv and node_modules
        dirs[:] = [d for d in dirs if d not in ['venv', 'node_modules', '__pycache__']]
        
        for file in files:
            if file.endswith('.py') and not file.startswith('check_user_types'):
                files_to_check.append(os.path.join(root, file))
    
    # Pattern to find hardcoded user_type values
    patterns = [
        r'user_type\s*==\s*([23])',  # user_type == 2 or user_type == 3
        r'user_type\s*=\s*([23])',   # user_type = 2 or user_type = 3
        r'user_type\s*!=\s*([23])',  # user_type != 2 or user_type != 3
    ]
    
    for file_path in files_to_check:
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
                lines = content.split('\n')
                
            for line_num, line in enumerate(lines, 1):
                # Skip comments and docstrings
                stripped = line.strip()
                if stripped.startswith('#') or stripped.startswith('"""') or stripped.startswith("'''"):
                    continue
                
                for pattern in patterns:
                    matches = re.finditer(pattern, line)
                    for match in matches:
                        value = match.group(1)
                        if value in deprecated_values:
                            # Get relative path for cleaner error messages
                            rel_path = os.path.relpath(file_path, backend_path)
                            
                            errors.append(
                                Error(
                                    f"Hardcoded user_type value '{value}' found in {rel_path}:{line_num}. "
                                    f"Use USER_TYPE_MERCHANT (5) or USER_TYPE_CUSTOMER (6) constants instead. "
                                    f"Line: {line.strip()}",
                                    hint=f"Import from shared.constants: "
                                         f"from shared.constants import USER_TYPE_MERCHANT, USER_TYPE_CUSTOMER",
                                    obj='users',  # Generic object
                                    id='users.E001'
                                )
                            )
        except Exception as e:
            # Skip files that can't be read
            continue
    
    return errors


@register
def check_user_type_constants_import(app_configs, **kwargs):
    """
    Check that files using user_type have proper constants imported
    """
    warnings = []
    
    backend_path = os.path.join(settings.BASE_DIR, '..')
    if not os.path.exists(backend_path):
        backend_path = settings.BASE_DIR
    
    # Files that use user_type but might not have constants imported
    files_to_check = []
    for root, dirs, files in os.walk(backend_path):
        dirs[:] = [d for d in dirs if d not in ['venv', 'node_modules', '__pycache__']]
        
        for file in files:
            if file.endswith('.py') and not file.startswith('check_user_types'):
                file_path = os.path.join(root, file)
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                        # Check if file uses user_type
                        if 'user_type' in content:
                            files_to_check.append(file_path)
                except:
                    continue
    
    for file_path in files_to_check:
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Check if file uses user_type but doesn't import constants
            if 'user_type' in content and 'USER_TYPE_' not in content:
                # Skip certain files that might legitimately not need constants
                skip_files = [
                    'shared/constants.py',
                    'migrations/',
                    'check_user_types.py',
                    'system_checks.py'
                ]
                
                rel_path = os.path.relpath(file_path, backend_path)
                if any(skip_file in rel_path for skip_file in skip_files):
                    continue
                
                warnings.append(
                    Warning(
                        f"File {rel_path} uses user_type but doesn't import USER_TYPE constants. "
                        f"Consider importing from shared.constants for consistency.",
                        hint="Add: from shared.constants import USER_TYPE_MERCHANT, USER_TYPE_CUSTOMER",
                        obj='users',
                        id='users.W001'
                    )
                )
        except:
            continue
    
    return warnings


@register  
def check_user_type_signal_consistency(app_configs, **kwargs):
    """
    Check that user type signals are consistent with constants
    """
    errors = []
    
    try:
        from shared.constants import USER_TYPE_MERCHANT, USER_TYPE_CUSTOMER
        from users.signals import create_user_profile, sync_merchant_user_type, sync_customer_user_type
        
        # This would be more complex to implement fully, but we can do basic checks
        # For now, just ensure the signals exist and are properly configured
        
    except ImportError as e:
        errors.append(
            Error(
                f"Missing user type constants or signals: {e}",
                hint="Ensure shared.constants and users.signals are properly configured",
                obj='users',
                id='users.E002'
            )
        )
    
    return errors
