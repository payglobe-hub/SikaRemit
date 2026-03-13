import { NetInfoState } from '@react-native-community/netinfo';

export interface ConnectivityStatus {
  isConnected: boolean;
  isInternetReachable: boolean;
  type: NetInfoState['type'];
  connectionType: string;
  strength: 'weak' | 'moderate' | 'strong';
  lastChanged: Date;
  isExpensive: boolean;
}

export interface ConnectivityListener {
  onConnectivityChanged: (status: ConnectivityStatus) => void;
  onConnectionLost: () => void;
  onConnectionRestored: () => void;
}

export interface NetworkQuality {
  latency: number;
  downloadSpeed: number;
  uploadSpeed: number;
  reliability: number;
}

export class ConnectivityManager {
  private static instance: ConnectivityManager;
  private listeners: ConnectivityListener[] = [];
  private currentStatus: ConnectivityStatus;
  private isMonitoring: boolean = false;
  private qualityCheckInterval?: NodeJS.Timeout;
  private lastQualityCheck: Date = new Date();

  private constructor() {
    this.currentStatus = {
      isConnected: true,
      isInternetReachable: true,
      type: 'none' as NetInfoState['type'],
      connectionType: 'unknown',
      strength: 'moderate',
      lastChanged: new Date(),
      isExpensive: false,
    };
  }

  static getInstance(): ConnectivityManager {
    if (!ConnectivityManager.instance) {
      ConnectivityManager.instance = new ConnectivityManager();
    }
    return ConnectivityManager.instance;
  }

  /**
   * Start monitoring connectivity changes
   */
  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      
      return;
    }

    try {
      const NetInfo = require('@react-native-netinfo/netinfo').default;
      
      // Get initial state
      const initialState = await NetInfo.fetch();
      this.updateConnectivityStatus(this.mapNetInfoState(initialState));

      // Subscribe to connectivity changes
      NetInfo.addEventListener((state: NetInfoState) => {
        this.handleConnectivityChange(state);
      });

      this.isMonitoring = true;
      
      
      // Start periodic quality checks
      this.startQualityChecks();
      
    } catch (error) {
      console.error('Failed to start connectivity monitoring:', error);
      throw error;
    }
  }

  /**
   * Stop monitoring connectivity changes
   */
  stopMonitoring(): void {
    if (this.qualityCheckInterval) {
      clearInterval(this.qualityCheckInterval);
      this.qualityCheckInterval = undefined;
    }
    this.isMonitoring = false;
    
  }

  /**
   * Add connectivity change listener
   */
  addListener(listener: ConnectivityListener): void {
    this.listeners.push(listener);
  }

  /**
   * Remove connectivity change listener
   */
  removeListener(listener: ConnectivityListener): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Get current connectivity status
   */
  getCurrentStatus(): ConnectivityStatus {
    return { ...this.currentStatus };
  }

  /**
   * Check if currently connected
   */
  isConnected(): boolean {
    return this.currentStatus.isConnected && this.currentStatus.isInternetReachable;
  }

  /**
   * Check if connection is good quality
   */
  isGoodConnection(): boolean {
    return this.isConnected() && 
           this.currentStatus.strength !== 'weak' && 
           !this.currentStatus.isExpensive;
  }

  /**
   * Get connection type for UI display
   */
  getConnectionDisplayText(): string {
    if (!this.isConnected()) {
      return 'Offline';
    }

    const typeMap: Record<string, string> = {
      wifi: 'WiFi',
      cellular: 'Mobile Data',
      ethernet: 'Ethernet',
      bluetooth: 'Bluetooth',
      wimax: 'WiMAX',
      vpn: 'VPN',
      other: 'Other',
      unknown: 'Unknown',
    };

    const connectionType = typeMap[this.currentStatus.type] || 'Unknown';
    const strength = this.currentStatus.strength;
    const expensive = this.currentStatus.isExpensive ? ' (Expensive)' : '';
    
    return `${connectionType} - ${strength}${expensive}`;
  }

  /**
   * Handle connectivity state changes
   */
  private handleConnectivityChange(state: NetInfoState): void {
    const newStatus = this.mapNetInfoState(state);
    const wasConnected = this.currentStatus.isConnected && this.currentStatus.isInternetReachable;
    const isConnected = newStatus.isConnected && newStatus.isInternetReachable;

    // Update status
    this.updateConnectivityStatus(newStatus);

    // Notify listeners
    this.listeners.forEach(listener => {
      listener.onConnectivityChanged(newStatus);
      
      if (wasConnected && !isConnected) {
        listener.onConnectionLost();
      } else if (!wasConnected && isConnected) {
        listener.onConnectionRestored();
      }
    });

    // Log significant changes
    if (wasConnected !== isConnected) {
      
    }
  }

  /**
   * Map NetInfo state to our ConnectivityStatus
   */
  private mapNetInfoState(state: NetInfoState): ConnectivityStatus {
    const strength = this.calculateConnectionStrength(state);
    
    return {
      isConnected: state.isConnected ?? false,
      isInternetReachable: state.isInternetReachable ?? false,
      type: state.type,
      connectionType: this.getConnectionType(state),
      strength,
      lastChanged: new Date(),
      isExpensive: this.isExpensiveConnection(state),
    };
  }

  /**
   * Calculate connection strength based on available details
   */
  private calculateConnectionStrength(state: NetInfoState): 'weak' | 'moderate' | 'strong' {
    if (!state.isConnected || !state.isInternetReachable) {
      return 'weak';
    }

    // For cellular connections, use details if available
    if (state.type === 'cellular' && state.details) {
      const details = state.details as any;
      
      // Check signal strength if available
      if (details.strength) {
        if (details.strength >= 0.7) return 'strong';
        if (details.strength >= 0.4) return 'moderate';
        return 'weak';
      }
      
      // Use cellular generation as fallback
      if (details.cellularGeneration) {
        const gen = details.cellularGeneration;
        if (gen === '5g') return 'strong';
        if (gen === '4g') return 'moderate';
        return 'weak';
      }
    }

    // For WiFi, assume strong if connected
    if (state.type === 'wifi') {
      return 'strong';
    }

    // Default to moderate for other connections
    return 'moderate';
  }

  /**
   * Get human-readable connection type
   */
  private getConnectionType(state: NetInfoState): string {
    if (state.type === 'cellular' && state.details) {
      const details = state.details as any;
      if (details.cellularGeneration) {
        return `${state.type.toUpperCase()} (${details.cellularGeneration.toUpperCase()})`;
      }
    }
    return state.type?.toUpperCase() || 'UNKNOWN';
  }

  /**
   * Check if connection is expensive (mobile data)
   */
  private isExpensiveConnection(state: NetInfoState): boolean {
    // Note: isConnectionExpensive is not available in current NetInfo API
    // This could be determined by connection type in the future
    return false;
  }

  /**
   * Update connectivity status and trigger change notifications
   */
  private updateConnectivityStatus(status: ConnectivityStatus): void {
    const wasConnected = this.currentStatus.isConnected && this.currentStatus.isInternetReachable;
    const isConnected = status.isConnected && status.isInternetReachable;
    
    this.currentStatus = status;

    // Trigger sync when connection is restored
    if (!wasConnected && isConnected) {
      this.triggerSyncOnConnectionRestore();
    }
  }

  /**
   * Trigger sync when connection is restored
   */
  private triggerSyncOnConnectionRestore(): void {
    // This will be implemented when we create the sync service
    
    // TODO: Integrate with SyncService
  }

  /**
   * Start periodic network quality checks
   */
  private startQualityChecks(): void {
    // Check network quality every 30 seconds
    this.qualityCheckInterval = setInterval(() => {
      this.checkNetworkQuality();
    }, 30000);
  }

  /**
   * Check network quality (latency, speed, etc.)
   */
  private async checkNetworkQuality(): Promise<void> {
    try {
      // Simple ping test to measure latency - using AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const startTime = Date.now();
      const response = await fetch('https://api.sikaremit.com/health', {
        method: 'HEAD',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      
      const latency = Date.now() - startTime;

      // Update connection strength based on latency
      if (latency < 200) {
        this.currentStatus.strength = 'strong';
      } else if (latency < 1000) {
        this.currentStatus.strength = 'moderate';
      } else {
        this.currentStatus.strength = 'weak';
      }

      this.lastQualityCheck = new Date();
      
      
    } catch (error) {
      console.warn('Network quality check failed:', error);
      this.currentStatus.strength = 'weak';
    }
  }

  /**
   * Get network quality metrics
   */
  async getNetworkQuality(): Promise<NetworkQuality> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const startTime = Date.now();
      const response = await fetch('https://api.sikaremit.com/health', {
        method: 'HEAD',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      
      const latency = Date.now() - startTime;

      return {
        latency,
        downloadSpeed: 0, // TODO: Implement speed test
        uploadSpeed: 0,   // TODO: Implement speed test
        reliability: this.calculateReliability(),
      };
    } catch (error) {
      return {
        latency: 9999,
        downloadSpeed: 0,
        uploadSpeed: 0,
        reliability: 0,
      };
    }
  }

  /**
   * Calculate connection reliability based on recent history
   */
  private calculateReliability(): number {
    // TODO: Implement reliability calculation based on connection history
    return this.isConnected() ? 0.9 : 0.1;
  }

  /**
   * Check if we should perform expensive operations
   */
  shouldPerformExpensiveOperations(): boolean {
    return this.isGoodConnection() && !this.currentStatus.isExpensive;
  }

  /**
   * Get recommended retry delay based on connection quality
   */
  getRetryDelay(baseDelay: number): number {
    if (!this.isConnected()) {
      return baseDelay * 4; // Longer delay when offline
    }
    
    switch (this.currentStatus.strength) {
      case 'weak':
        return baseDelay * 2;
      case 'moderate':
        return baseDelay * 1.5;
      case 'strong':
        return baseDelay;
      default:
        return baseDelay * 2;
    }
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.stopMonitoring();
    this.listeners = [];
  }
}

