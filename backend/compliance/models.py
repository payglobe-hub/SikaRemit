from django.db import models
from users.models import User

class RegulatorySubmission(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    report_data = models.JSONField()
    submitted_at = models.DateTimeField(auto_now_add=True)
    success = models.BooleanField()
    response = models.TextField(blank=True)
    
    def __str__(self):
        return f"Submission for {self.user.email}"

class GDPRConsent(models.Model):
    """Record of user consent per GDPR Article 7"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='gdpr_consents')
    purpose = models.CharField(max_length=255)
    consent_text = models.TextField()
    ip_address = models.GenericIPAddressField()
    consented_at = models.DateTimeField()
    withdrawn_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        ordering = ['-consented_at']
    
    def __str__(self):
        return f"{self.user.email} - {self.purpose}"

class GDPRDataDeletion(models.Model):
    """Right to erasure requests"""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('rejected', 'Rejected'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='deletion_requests')
    reason = models.TextField()
    requested_at = models.DateTimeField()
    completed_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    notes = models.TextField(blank=True)
    
    class Meta:
        ordering = ['-requested_at']
    
    def __str__(self):
        return f"Deletion request for {self.user.email}"

class GDPRDataRectification(models.Model):
    """Right to rectification log"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='rectifications')
    fields_updated = models.JSONField()
    rectified_at = models.DateTimeField()
    
    def __str__(self):
        return f"Rectification for {self.user.email}"

class GDPRDataBreach(models.Model):
    """Data breach records per Article 33"""
    SEVERITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ]
    
    description = models.TextField()
    affected_users = models.IntegerField(default=0)
    data_categories = models.JSONField(default=list)
    discovered_at = models.DateTimeField()
    reported_at = models.DateTimeField(null=True, blank=True)
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES)
    mitigation_actions = models.TextField(blank=True)
    authority_notified = models.BooleanField(default=False)
    users_notified = models.BooleanField(default=False)
    
    class Meta:
        ordering = ['-discovered_at']
    
    def __str__(self):
        return f"Breach {self.id} - {self.severity}"

class SuspiciousActivityReport(models.Model):
    """
    Suspicious Activity Report (SAR) for FIC reporting
    Reference: Anti-Money Laundering Act, 2020 (Act 1044)
    """
    STATUS_CHOICES = [
        ('pending', 'Pending Review'),
        ('reviewed', 'Reviewed'),
        ('reported', 'Reported to FIC'),
        ('dismissed', 'Dismissed'),
    ]
    
    TRIGGER_CHOICES = [
        ('large_cash_transaction', 'Large Cash Transaction (> GHS 50,000)'),
        ('structured_transactions', 'Structured Transactions'),
        ('unusual_pattern', 'Unusual Transaction Pattern'),
        ('high_risk_country', 'High Risk Country'),
        ('pep_involvement', 'Politically Exposed Person'),
        ('sanctions_match', 'Sanctions List Match'),
        ('rapid_movement', 'Rapid Movement of Funds'),
        ('third_party_funding', 'Third Party Funding'),
        ('other', 'Other'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='suspicious_activity_reports')
    transaction = models.ForeignKey(
        'payments.Transaction',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='sars'
    )
    trigger_reason = models.CharField(max_length=50, choices=TRIGGER_CHOICES)
    additional_info = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    # Timestamps
    reported_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    submitted_to_fic_at = models.DateTimeField(null=True, blank=True)
    
    # Review details
    reviewed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_sars'
    )
    review_notes = models.TextField(blank=True)
    fic_reference = models.CharField(max_length=100, blank=True)
    
    class Meta:
        ordering = ['-reported_at']
        verbose_name = 'Suspicious Activity Report'
        verbose_name_plural = 'Suspicious Activity Reports'
    
    def __str__(self):
        return f"SAR-{self.id}: {self.get_trigger_reason_display()}"
    
    def mark_reviewed(self, reviewer, notes=''):
        """Mark SAR as reviewed"""
        from django.utils import timezone
        self.status = 'reviewed'
        self.reviewed_by = reviewer
        self.reviewed_at = timezone.now()
        self.review_notes = notes
        self.save()
    
    def submit_to_fic(self, fic_reference=''):
        """Mark SAR as submitted to FIC"""
        from django.utils import timezone
        self.status = 'reported'
        self.submitted_to_fic_at = timezone.now()
        self.fic_reference = fic_reference
        self.save()

class BOGMonthlyReport(models.Model):
    """
    Monthly regulatory report for Bank of Ghana
    """
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('pending', 'Pending Submission'),
        ('submitted', 'Submitted'),
        ('acknowledged', 'Acknowledged by BoG'),
    ]
    
    year = models.IntegerField()
    month = models.IntegerField()
    report_data = models.JSONField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    
    generated_at = models.DateTimeField(auto_now_add=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    submitted_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='submitted_bog_reports'
    )
    bog_reference = models.CharField(max_length=100, blank=True)
    
    class Meta:
        ordering = ['-year', '-month']
        unique_together = ['year', 'month']
        verbose_name = 'BoG Monthly Report'
        verbose_name_plural = 'BoG Monthly Reports'
    
    def __str__(self):
        return f"BoG Report {self.year}-{self.month:02d}"
