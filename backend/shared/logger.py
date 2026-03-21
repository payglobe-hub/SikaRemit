import logging
from logging.handlers import RotatingFileHandler
import os
from pathlib import Path
import json
from django.conf import settings

class AppLogger:
    def __init__(self, name='app'):
        self.logger = logging.getLogger(name)
        self.logger.setLevel(logging.DEBUG if settings.DEBUG else logging.INFO)
        
        # Create logs directory if it doesn't exist
        logs_dir = Path(__file__).parent.parent / 'logs'
        os.makedirs(logs_dir, exist_ok=True)
        
        # File handler
        file_handler = RotatingFileHandler(
            logs_dir / 'app.log',
            maxBytes=1024*1024,
            backupCount=5
        )
        file_handler.setFormatter(logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(request_id)s - %(message)s'
        ))
        
        # Console handler
        console_handler = logging.StreamHandler()
        console_handler.setFormatter(logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        ))
        
        self.logger.addHandler(file_handler)
        self.logger.addHandler(console_handler)
    
    def get_logger(self, request=None):
        """Get logger with request context if available"""
        extra = {}
        if request and hasattr(request, 'id'):
            extra['request_id'] = request.id
        return logging.LoggerAdapter(self.logger, extra)
