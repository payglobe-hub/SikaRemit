document.addEventListener('DOMContentLoaded', function() {
    // Add exemption workflow UI enhancements
    const exemptionField = document.querySelector('#id_exemption_status');
    if (exemptionField) {
        exemptionField.addEventListener('change', function() {
            const notesField = document.querySelector('#id_exemption_notes');
            if (this.value === 'rejected' && !notesField.value) {
                alert('Please provide rejection reason in notes field');
                notesField.focus();
            }
        });
    }
});
