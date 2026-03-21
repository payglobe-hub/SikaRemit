import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';
import { BorderRadius, FontSize, FontWeight, Spacing } from '../../constants/theme';

const { width } = Dimensions.get('window');

interface KYCRequiredModalProps {
  visible: boolean;
  onClose: () => void;
  onVerifyNow: () => void;
  kycStatus?: 'pending' | 'approved' | 'rejected' | 'not_submitted';
}

const KYCRequiredModal: React.FC<KYCRequiredModalProps> = ({
  visible,
  onClose,
  onVerifyNow,
  kycStatus = 'not_submitted',
}) => {
  const { colors } = useTheme();

  const getStatusContent = () => {
    switch (kycStatus) {
      case 'pending':
        return {
          icon: 'time-outline' as const,
          iconColor: '#F59E0B',
          title: 'Verification In Progress',
          message: 'Your KYC verification is being reviewed. This usually takes 1-2 business days. We\'ll notify you once it\'s approved.',
          buttonText: 'Check Status',
          showButton: true,
        };
      case 'rejected':
        return {
          icon: 'close-circle-outline' as const,
          iconColor: '#EF4444',
          title: 'Verification Rejected',
          message: 'Your KYC verification was rejected. Please review the feedback and submit your documents again.',
          buttonText: 'Resubmit Documents',
          showButton: true,
        };
      case 'not_submitted':
      default:
        return {
          icon: 'shield-checkmark-outline' as const,
          iconColor: '#8B5CF6',
          title: 'Verify Your Identity',
          message: 'To send money locally or internationally, you need to complete identity verification. This helps us keep your account secure and comply with regulations.',
          buttonText: 'Verify Now',
          showButton: true,
        };
    }
  };

  const content = getStatusContent();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modalContainer, { backgroundColor: colors.surface }]}>
          {/* Close Button */}
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color={colors.textMuted} />
          </TouchableOpacity>

          {/* Icon */}
          <View style={[styles.iconContainer, { backgroundColor: content.iconColor + '15' }]}>
            <Ionicons name={content.icon} size={48} color={content.iconColor} />
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: colors.text }]}>
            {content.title}
          </Text>

          {/* Message */}
          <Text style={[styles.message, { color: colors.textSecondary }]}>
            {content.message}
          </Text>

          {/* Benefits List (only for not_submitted) */}
          {kycStatus === 'not_submitted' && (
            <View style={styles.benefitsList}>
              <View style={styles.benefitItem}>
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                <Text style={[styles.benefitText, { color: colors.text }]}>
                  Send money locally & internationally
                </Text>
              </View>
              <View style={styles.benefitItem}>
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                <Text style={[styles.benefitText, { color: colors.text }]}>
                  Higher transaction limits
                </Text>
              </View>
              <View style={styles.benefitItem}>
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                <Text style={[styles.benefitText, { color: colors.text }]}>
                  Enhanced account security
                </Text>
              </View>
            </View>
          )}

          {/* Action Button */}
          {content.showButton && (
            <TouchableOpacity style={styles.actionButton} onPress={onVerifyNow}>
              <LinearGradient
                colors={['#8B5CF6', '#7C3AED']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradientButton}
              >
                <Ionicons name="shield-checkmark" size={20} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>{content.buttonText}</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}

          {/* Later Button */}
          <TouchableOpacity style={styles.laterButton} onPress={onClose}>
            <Text style={[styles.laterButtonText, { color: colors.textMuted }]}>
              Maybe Later
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalContainer: {
    width: width - Spacing.lg * 2,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    padding: Spacing.xs,
  },
  iconContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold as any,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  message: {
    fontSize: FontSize.md,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  benefitsList: {
    width: '100%',
    marginBottom: Spacing.lg,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  benefitText: {
    fontSize: FontSize.sm,
    flex: 1,
  },
  actionButton: {
    width: '100%',
    marginBottom: Spacing.md,
  },
  gradientButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold as any,
  },
  laterButton: {
    padding: Spacing.sm,
  },
  laterButtonText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium as any,
  },
});

export default KYCRequiredModal;
