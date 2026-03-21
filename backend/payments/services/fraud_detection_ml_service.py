"""
Machine Learning Fraud Detection Service
Advanced fraud detection using ML algorithms and behavioral analysis
"""
import logging
from django.conf import settings
from django.utils import timezone
from django.db.models import Count, Sum, Avg, Q, F
from django.db.models.functions import TruncDate, TruncHour
from decimal import Decimal
from typing import Dict, List, Any, Optional, Tuple
from datetime import timedelta, datetime
import numpy as np
import pandas as pd
from collections import defaultdict, Counter
import statistics
import math
from sklearn.ensemble import IsolationForest, RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
import joblib
import os
import json

logger = logging.getLogger(__name__)

class MLFraudDetectionService:
    """
    Machine Learning-based fraud detection service
    """

    MODEL_PATH = 'ml_models/fraud_detection'
    FEATURES_PATH = 'ml_models/features'

    # Fraud detection thresholds
    HIGH_RISK_SCORE = 0.8
    MEDIUM_RISK_SCORE = 0.6
    LOW_RISK_SCORE = 0.4

    # Feature weights for scoring
    FEATURE_WEIGHTS = {
        'amount_anomaly': 0.25,
        'frequency_anomaly': 0.20,
        'geographic_anomaly': 0.15,
        'time_anomaly': 0.15,
        'device_anomaly': 0.10,
        'behavioral_anomaly': 0.15
    }

    def __init__(self):
        self.model = None
        self.scaler = None
        self.feature_columns = []
        self._load_or_train_model()

    def _load_or_train_model(self):
        """
        Load existing model or train new one
        """
        try:
            model_path = os.path.join(settings.MEDIA_ROOT, self.MODEL_PATH + '.pkl')
            if os.path.exists(model_path):
                self.model = joblib.load(model_path)
                logger.info("Loaded existing fraud detection model")
            else:
                self._train_initial_model()
        except Exception as e:
            logger.error(f"Failed to load/train fraud detection model: {str(e)}")
            # Fallback to rule-based detection
            self.model = None

    def _train_initial_model(self):
        """
        Train initial fraud detection model with synthetic/historical data
        """
        try:
            # Generate synthetic training data
            training_data = self._generate_synthetic_training_data()

            if training_data:
                X = training_data.drop('is_fraud', axis=1)
                y = training_data['is_fraud']

                # Train model
                self.model = RandomForestClassifier(
                    n_estimators=100,
                    max_depth=10,
                    random_state=42,
                    class_weight='balanced'
                )

                self.model.fit(X, y)
                self.feature_columns = list(X.columns)

                # Save model
                os.makedirs(os.path.dirname(os.path.join(settings.MEDIA_ROOT, self.MODEL_PATH)), exist_ok=True)
                joblib.dump(self.model, os.path.join(settings.MEDIA_ROOT, self.MODEL_PATH + '.pkl'))

                logger.info("Trained and saved initial fraud detection model")

        except Exception as e:
            logger.error(f"Failed to train fraud detection model: {str(e)}")

    def _generate_synthetic_training_data(self) -> Optional[pd.DataFrame]:
        """
        Generate synthetic training data for fraud detection
        """
        try:
            # This would be replaced with real historical data in production
            np.random.seed(42)

            n_samples = 10000
            fraud_ratio = 0.05  # 5% fraud rate

            data = []

            for i in range(n_samples):
                is_fraud = np.random.random() < fraud_ratio

                # Generate features based on fraud patterns
                if is_fraud:
                    # Fraudulent transaction patterns
                    amount = np.random.exponential(500) + 100  # Higher amounts
                    frequency_score = np.random.beta(2, 5) * 10  # Higher frequency
                    geographic_score = np.random.beta(2, 2)  # Unusual locations
                    time_score = np.random.beta(2, 3)  # Unusual times
                    device_score = np.random.beta(2, 2)  # New devices
                    behavioral_score = np.random.beta(2, 2)  # Unusual behavior
                else:
                    # Normal transaction patterns
                    amount = np.random.exponential(100) + 10  # Normal amounts
                    frequency_score = np.random.beta(5, 2) * 10  # Normal frequency
                    geographic_score = np.random.beta(5, 1)  # Normal locations
                    time_score = np.random.beta(3, 2)  # Normal times
                    device_score = np.random.beta(3, 1)  # Known devices
                    behavioral_score = np.random.beta(3, 1)  # Normal behavior

                data.append({
                    'amount': amount,
                    'frequency_score': frequency_score,
                    'geographic_score': geographic_score,
                    'time_score': time_score,
                    'device_score': device_score,
                    'behavioral_score': behavioral_score,
                    'is_fraud': int(is_fraud)
                })

            return pd.DataFrame(data)

        except Exception as e:
            logger.error(f"Failed to generate training data: {str(e)}")
            return None

    def analyze_transaction(self, transaction) -> Dict[str, Any]:
        """
        Analyze a transaction for fraud using ML and rule-based detection
        """
        try:
            # Extract features from transaction
            features = self._extract_transaction_features(transaction)

            # Calculate fraud score
            fraud_score = self._calculate_fraud_score(features)

            # ML prediction if model is available
            ml_prediction = None
            ml_confidence = None

            if self.model and features:
                try:
                    feature_vector = np.array([[
                        features.get(col, 0) for col in self.feature_columns
                    ]])
                    ml_prediction = self.model.predict_proba(feature_vector)[0][1]
                    ml_confidence = max(ml_prediction, 1 - ml_prediction)
                except Exception as e:
                    logger.warning(f"ML prediction failed: {str(e)}")

            # Determine risk level
            risk_level = self._determine_risk_level(fraud_score, ml_prediction)

            # Generate recommendations
            recommendations = self._generate_recommendations(fraud_score, risk_level, features)

            result = {
                'transaction_id': transaction.id,
                'fraud_score': fraud_score,
                'risk_level': risk_level,
                'ml_prediction': ml_prediction,
                'ml_confidence': ml_confidence,
                'features_analyzed': features,
                'recommendations': recommendations,
                'requires_review': risk_level in ['high', 'critical'],
                'auto_block': risk_level == 'critical',
                'timestamp': timezone.now().isoformat()
            }

            # Log high-risk transactions
            if risk_level in ['high', 'critical']:
                logger.warning(f"High-risk transaction detected: {transaction.id}, score: {fraud_score}")

            return result

        except Exception as e:
            logger.error(f"Fraud analysis failed for transaction {transaction.id}: {str(e)}")
            return {
                'transaction_id': transaction.id,
                'error': str(e),
                'risk_level': 'unknown',
                'requires_review': True
            }

    def _extract_transaction_features(self, transaction) -> Dict[str, float]:
        """
        Extract fraud detection features from transaction
        """
        try:
            user = transaction.customer.user
            now = timezone.now()

            features = {}

            # Amount-based features
            features['amount'] = float(transaction.amount)
            features['amount_anomaly'] = self._calculate_amount_anomaly(transaction)

            # Frequency-based features
            features['frequency_score'] = self._calculate_frequency_score(user, transaction)

            # Geographic features
            features['geographic_score'] = self._calculate_geographic_score(user, transaction)

            # Time-based features
            features['time_score'] = self._calculate_time_anomaly(transaction)

            # Device/browser features (simplified)
            features['device_score'] = self._calculate_device_score(transaction)

            # Behavioral features
            features['behavioral_score'] = self._calculate_behavioral_score(user, transaction)

            # Historical features
            features['user_transaction_count'] = self._get_user_transaction_count(user)
            features['user_fraud_history'] = self._get_user_fraud_history(user)

            return features

        except Exception as e:
            logger.error(f"Feature extraction failed: {str(e)}")
            return {}

    def _calculate_amount_anomaly(self, transaction) -> float:
        """
        Calculate amount anomaly score
        """
        try:
            user = transaction.customer.user
            amount = float(transaction.amount)

            # Get user's historical transaction amounts
            historical_amounts = list(transaction.customer.customer_transactions.filter(
                status='completed',
                created_at__gte=timezone.now() - timedelta(days=90)
            ).values_list('amount', flat=True))

            if len(historical_amounts) < 5:
                return 0.0  # Not enough history

            # Calculate z-score
            mean_amount = statistics.mean(historical_amounts)
            std_amount = statistics.stdev(historical_amounts) if len(historical_amounts) > 1 else 1

            if std_amount == 0:
                return 1.0 if amount != mean_amount else 0.0

            z_score = abs(amount - mean_amount) / std_amount

            # Convert to 0-1 scale (higher = more anomalous)
            return min(z_score / 3.0, 1.0)  # Cap at 3 standard deviations

        except Exception as e:
            logger.error(f"Amount anomaly calculation failed: {str(e)}")
            return 0.5

    def _calculate_frequency_score(self, user, transaction) -> float:
        """
        Calculate transaction frequency anomaly score
        """
        try:
            # Count transactions in last 24 hours
            recent_transactions = transaction.customer.customer_transactions.filter(
                created_at__gte=timezone.now() - timedelta(hours=24)
            ).count()

            # Count transactions in last hour
            very_recent = transaction.customer.customer_transactions.filter(
                created_at__gte=timezone.now() - timedelta(hours=1)
            ).count()

            # Calculate frequency score
            frequency_score = min(recent_transactions / 10.0, 1.0)  # Normalize to 0-1
            frequency_score += min(very_recent / 5.0, 1.0)  # Add burst activity

            return min(frequency_score, 1.0)

        except Exception as e:
            return 0.0

    def _calculate_geographic_score(self, user, transaction) -> float:
        """
        Calculate geographic anomaly score based on IP and country data
        """
        try:
            score = 0.0
            metadata = getattr(transaction, 'metadata', {}) or {}
            ip_address = metadata.get('ip_address', '')
            country_to = getattr(transaction, 'country_to', '')

            # Check if transaction country differs from user's usual countries
            if country_to:
                from payments.models import Transaction
                usual_countries = list(
                    Transaction.objects.filter(
                        customer__user=user, status='completed'
                    ).values_list('country_to', flat=True).distinct()[:10]
                )
                if usual_countries and country_to not in usual_countries:
                    score += 0.6  # New country is suspicious

            # Check IP geolocation if available
            if ip_address:
                try:
                    from django.contrib.gis.geoip2 import GeoIP2
                    geo = GeoIP2()
                    ip_country = geo.country_code(ip_address)
                    if ip_country and country_to and ip_country != country_to:
                        score += 0.4  # IP country mismatch
                except Exception:
                    pass  # GeoIP2 not configured

            return min(score, 1.0)

        except Exception as e:
            logger.error(f"Geographic score calculation failed: {str(e)}")
            return 0.0

    def _calculate_time_anomaly(self, transaction) -> float:
        """
        Calculate time-based anomaly score
        """
        try:
            hour = transaction.created_at.hour

            # Flag transactions during unusual hours (2-5 AM)
            if 2 <= hour <= 5:
                return 0.8

            # Slightly flag late night/early morning
            if hour >= 22 or hour <= 6:
                return 0.4

            return 0.0

        except Exception as e:
            logger.error(f"Time anomaly calculation failed: {str(e)}")
            return 0.0

    def _calculate_device_score(self, transaction) -> float:
        """
        Calculate device/browser anomaly score based on metadata
        """
        try:
            score = 0.0
            metadata = getattr(transaction, 'metadata', {}) or {}
            user_agent = metadata.get('user_agent', '')
            device_id = metadata.get('device_id', '')

            # No device info at all is mildly suspicious
            if not user_agent and not device_id:
                return 0.2

            # Check if this device has been seen before for this user
            if device_id:
                from payments.models import Transaction
                user = getattr(transaction, 'customer', None)
                if user:
                    user_obj = getattr(user, 'user', user)
                    known_devices = Transaction.objects.filter(
                        customer__user=user_obj, status='completed',
                        metadata__device_id=device_id
                    ).exists()
                    if not known_devices:
                        score += 0.5  # New device

            # Check for suspicious user agents (automation tools)
            suspicious_agents = ['curl', 'wget', 'python-requests', 'scrapy', 'bot']
            if user_agent and any(agent in user_agent.lower() for agent in suspicious_agents):
                score += 0.7

            return min(score, 1.0)

        except Exception as e:
            logger.error(f"Device score calculation failed: {str(e)}")
            return 0.0

    def _get_user_transaction_count(self, user) -> int:
        """Get total transaction count for user"""
        return user.customer.customer_transactions.count()

    def _get_user_fraud_history(self, user) -> int:
        """Get user's fraud history score from transaction data"""
        try:
            from payments.models import Transaction
            # Count transactions flagged as fraudulent or refunded due to fraud
            fraud_count = Transaction.objects.filter(
                customer__user=user,
                status__in=['fraud_blocked', 'fraud_review', 'reversed']
            ).count()

            # Also count chargebacks/disputes
            try:
                from payments.models.dispute import Dispute
                dispute_count = Dispute.objects.filter(
                    transaction__customer__user=user
                ).count()
                fraud_count += dispute_count
            except (ImportError, Exception):
                pass

            return fraud_count
        except Exception:
            return 0

    def _calculate_fraud_score(self, features: Dict[str, float]) -> float:
        """
        Calculate overall fraud score using weighted features
        """
        try:
            score = 0.0

            for feature, weight in self.FEATURE_WEIGHTS.items():
                feature_value = features.get(feature, 0.0)
                score += feature_value * weight

            return min(score, 1.0)

        except Exception as e:
            logger.error(f"Fraud score calculation failed: {str(e)}")
            return 0.5

    def _determine_risk_level(self, fraud_score: float, ml_prediction: Optional[float]) -> str:
        """
        Determine risk level based on scores
        """
        # Use ML prediction if available and confident
        if ml_prediction is not None:
            effective_score = (fraud_score + ml_prediction) / 2
        else:
            effective_score = fraud_score

        if effective_score >= self.HIGH_RISK_SCORE:
            return 'critical'
        elif effective_score >= self.MEDIUM_RISK_SCORE:
            return 'high'
        elif effective_score >= self.LOW_RISK_SCORE:
            return 'medium'
        else:
            return 'low'

    def _generate_recommendations(self, fraud_score: float, risk_level: str, features: Dict[str, float]) -> List[str]:
        """
        Generate fraud prevention recommendations
        """
        recommendations = []

        if risk_level in ['high', 'critical']:
            recommendations.append("Transaction flagged for manual review")
            recommendations.append("Consider additional verification steps")

        if features.get('amount_anomaly', 0) > 0.7:
            recommendations.append("Unusual transaction amount detected")

        if features.get('frequency_anomaly', 0) > 0.7:
            recommendations.append("Unusual transaction frequency detected")

        if features.get('geographic_anomaly', 0) > 0.7:
            recommendations.append("Transaction from unusual location")

        if features.get('time_anomaly', 0) > 0.7:
            recommendations.append("Transaction at unusual time")

        if not recommendations:
            recommendations.append("Transaction appears normal")

        return recommendations

    def update_model_with_feedback(self, transaction_id: str, is_fraud: bool):
        """
        Update ML model with human feedback for continuous learning
        """
        try:
            # This would update the model with new labeled data
            # Implementation would depend on the specific ML pipeline
            logger.info(f"Model update requested for transaction {transaction_id}: fraud={is_fraud}")

        except Exception as e:
            logger.error(f"Model update failed: {str(e)}")

    def get_fraud_statistics(self, days: int = 30) -> Dict[str, Any]:
        """
        Get fraud detection statistics
        """
        try:
            end_date = timezone.now()
            start_date = end_date - timedelta(days=days)

            # This would query fraud detection logs in production
            return {
                'period_days': days,
                'total_transactions_analyzed': 0,
                'fraud_detected': 0,
                'false_positives': 0,
                'detection_accuracy': 0.0,
                'average_response_time': 0.0
            }

        except Exception as e:
            logger.error(f"Failed to get fraud statistics: {str(e)}")
            return {}

class BehavioralAnalysisService:
    """
    User behavioral analysis for fraud detection
    """

    def __init__(self):
        self.user_profiles = {}

    def analyze_user_behavior(self, user, transaction) -> Dict[str, Any]:
        """
        Analyze user behavior patterns
        """
        try:
            user_id = str(user.id)

            # Get or create user profile
            if user_id not in self.user_profiles:
                self.user_profiles[user_id] = self._build_user_profile(user)

            profile = self.user_profiles[user_id]

            # Analyze current transaction against profile
            anomalies = self._detect_behavioral_anomalies(transaction, profile)

            # Update profile with new transaction
            self._update_user_profile(profile, transaction)

            return {
                'user_id': user_id,
                'behavioral_anomalies': anomalies,
                'profile_updated': True,
                'risk_score': self._calculate_behavioral_risk(anomalies)
            }

        except Exception as e:
            logger.error(f"Behavioral analysis failed: {str(e)}")
            return {'error': str(e)}

    def _build_user_profile(self, user) -> Dict[str, Any]:
        """
        Build behavioral profile for user
        """
        try:
            # Get user's transaction history
            transactions = user.customer.customer_transactions.filter(
                status='completed'
            ).order_by('-created_at')[:100]  # Last 100 transactions

            if not transactions:
                return self._create_empty_profile()

            # Analyze patterns
            amounts = [float(t.amount) for t in transactions]
            hours = [t.created_at.hour for t in transactions]

            return {
                'avg_amount': statistics.mean(amounts) if amounts else 0,
                'std_amount': statistics.stdev(amounts) if len(amounts) > 1 else 0,
                'common_hours': Counter(hours).most_common(3),
                'transaction_count': len(transactions),
                'last_transaction': transactions[0].created_at if transactions else None
            }

        except Exception as e:
            logger.error(f"Profile building failed: {str(e)}")
            return self._create_empty_profile()

    def _create_empty_profile(self) -> Dict[str, Any]:
        """Create empty profile for new users"""
        return {
            'avg_amount': 0,
            'std_amount': 0,
            'common_hours': [],
            'transaction_count': 0,
            'last_transaction': None
        }

    def _detect_behavioral_anomalies(self, transaction, profile: Dict[str, Any]) -> List[str]:
        """
        Detect behavioral anomalies
        """
        anomalies = []

        try:
            amount = float(transaction.amount)
            hour = transaction.created_at.hour

            # Amount anomaly
            if profile['std_amount'] > 0:
                amount_zscore = abs(amount - profile['avg_amount']) / profile['std_amount']
                if amount_zscore > 2.0:
                    anomalies.append('unusual_amount')

            # Time anomaly
            common_hours = [h for h, _ in profile['common_hours']]
            if hour not in common_hours and profile['transaction_count'] > 5:
                anomalies.append('unusual_time')

            # Frequency anomaly (would need more sophisticated analysis)

        except Exception as e:
            logger.error(f"Anomaly detection failed: {str(e)}")

        return anomalies

    def _update_user_profile(self, profile: Dict[str, Any], transaction):
        """
        Update user profile with new transaction data
        """
        try:
            # Simple exponential moving average update
            alpha = 0.1  # Learning rate

            new_amount = float(transaction.amount)
            profile['avg_amount'] = (1 - alpha) * profile['avg_amount'] + alpha * new_amount
            profile['transaction_count'] += 1
            profile['last_transaction'] = transaction.created_at

        except Exception as e:
            logger.error(f"Profile update failed: {str(e)}")

    def _calculate_behavioral_risk(self, anomalies: List[str]) -> float:
        """
        Calculate behavioral risk score
        """
        risk_score = 0.0

        anomaly_weights = {
            'unusual_amount': 0.4,
            'unusual_time': 0.3,
            'unusual_frequency': 0.3
        }

        for anomaly in anomalies:
            risk_score += anomaly_weights.get(anomaly, 0.1)

        return min(risk_score, 1.0)
