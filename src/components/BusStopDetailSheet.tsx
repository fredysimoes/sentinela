import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Haptics, { ImpactFeedbackStyle } from '../utils/haptics';
import { StopArrivalPrediction, TransitStop, RouteCoordinate } from '../types/navigation';
import { calculateDistanceMeters, formatDistance } from '../utils/geo';
import { fetchStopRealtimeArrivals } from '../services/stcpRealtimeService';
import { M3Colors, M3Shapes, M3Elevation, M3Motion } from '../theme/m3';
import { M3BottomSheetWrapper, M3Pressable } from './M3MotionWrapper';

interface BusStopDetailSheetProps {
  stop: TransitStop | null;
  userLocation?: RouteCoordinate | null;
  onClose: () => void;
  onNavigateToStop: (stop: TransitStop) => void;
  onPlanRouteFromStop?: (stop: TransitStop) => void;
}

export const BusStopDetailSheet: React.FC<BusStopDetailSheetProps> = ({
  stop,
  userLocation,
  onClose,
  onNavigateToStop,
  onPlanRouteFromStop,
}) => {
  const [arrivals, setArrivals] = useState<StopArrivalPrediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadArrivals = async (stopCode: string) => {
    setIsLoading(true);
    const data = await fetchStopRealtimeArrivals(stopCode);
    setArrivals(data);
    setLastUpdated(new Date());
    setIsLoading(false);
  };

  useEffect(() => {
    if (!stop?.code) {
      setArrivals([]);
      return;
    }

    loadArrivals(stop.code);

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    // Atualização automática suave a cada 15s enquanto aberto
    timerRef.current = setInterval(() => {
      loadArrivals(stop.code);
    }, 15000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [stop?.code]);

  if (!stop) return null;

  const distMeters = userLocation
    ? calculateDistanceMeters(
        userLocation.latitude,
        userLocation.longitude,
        stop.latitude,
        stop.longitude
      )
    : stop.distanceMeters;

  const handleManualRefresh = () => {
    Haptics.impactAsync(ImpactFeedbackStyle.Light);
    loadArrivals(stop.code);
  };

  return (
    <M3BottomSheetWrapper visible={!!stop} onClose={onClose} style={styles.sheetContainer}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.busIconBadge}>
          <MaterialCommunityIcons name="bus-stop" size={24} color="#38BDF8" />
        </View>

        <View style={{ flex: 1 }}>
          <View style={styles.titleRow}>
            <Text style={styles.stopNameText} numberOfLines={1}>
              {stop.name}
            </Text>
            <View style={styles.stopCodePill}>
              <Text style={styles.stopCodePillText}>{stop.code}</Text>
            </View>
          </View>
          <Text style={styles.subtitleText}>
            {distMeters ? `A ${formatDistance(distMeters)} da sua localização` : 'Rede de Transportes Públicos'}
            {' • Atualizado ' + lastUpdated.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </Text>
        </View>

        <M3Pressable onPress={handleManualRefresh} style={styles.refreshBtn}>
          {isLoading ? (
            <ActivityIndicator size="small" color="#38BDF8" />
          ) : (
            <Ionicons name="refresh" size={18} color="#94A3B8" />
          )}
        </M3Pressable>
      </View>

      {/* Arrivals Content */}
      <View style={styles.contentWrap}>
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>Próximas Chegadas em Tempo Real</Text>
          <View style={styles.livePulseDot} />
        </View>

        <ScrollView
          style={styles.arrivalsList}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 12 }}
        >
          {arrivals.length === 0 ? (
            <View style={styles.emptyContainer}>
              {isLoading ? (
                <>
                  <ActivityIndicator size="small" color="#38BDF8" style={{ marginBottom: 8 }} />
                  <Text style={styles.emptyText}>A carregar previsões em direto...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="time-outline" size={32} color="#64748B" style={{ marginBottom: 6 }} />
                  <Text style={styles.emptyText}>
                    Sem autocarros previstos nos próximos minutos para esta paragem.
                  </Text>
                </>
              )}
            </View>
          ) : (
            arrivals.map((arr, index) => {
              const isDue = arr.arrivalMinutes <= 1;
              const isDelayed = arr.status === 'DELAYED' || (arr.delayMinutes && arr.delayMinutes > 2);

              return (
                <View key={`arrival-row-${index}`} style={styles.arrivalCard}>
                  {/* Linha Badge */}
                  <View
                    style={[
                      styles.routeBadge,
                      arr.color ? { backgroundColor: arr.color } : null,
                    ]}
                  >
                    <Text
                      style={[
                        styles.routeBadgeText,
                        arr.textColor ? { color: arr.textColor } : null,
                      ]}
                    >
                      {arr.routeShortName}
                    </Text>
                  </View>

                  {/* Informações da Linha & Destino */}
                  <View style={{ flex: 1, paddingHorizontal: 10 }}>
                    <Text style={styles.headsignText} numberOfLines={1}>
                      {arr.headsign || 'Em circulação'}
                    </Text>
                    <View style={styles.statusRow}>
                      <View
                        style={[
                          styles.statusDot,
                          { backgroundColor: isDelayed ? '#F59E0B' : '#10B981' },
                        ]}
                      />
                      <Text style={styles.statusSubText}>
                        {isDelayed
                          ? `Atraso: +${Math.round(arr.delayMinutes || 0)} min`
                          : 'A horas'}
                      </Text>
                    </View>
                  </View>

                  {/* Contagem Decrescente */}
                  <View style={styles.timeBadgeWrap}>
                    <Text style={[styles.timeMinutesText, isDue && styles.timeMinutesDue]}>
                      {isDue ? 'A chegar' : `${arr.arrivalMinutes} min`}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      </View>

      {/* Action Buttons */}
      <View style={styles.footerActions}>
        <M3Pressable
          style={styles.primaryNavigateBtn}
          onPress={() => {
            Haptics.impactAsync(ImpactFeedbackStyle.Medium);
            onNavigateToStop(stop);
          }}
        >
          <Ionicons name="walk" size={17} color="#383139" />
          <Text style={styles.primaryNavigateBtnText}>Caminhar até à Paragem</Text>
        </M3Pressable>

        {onPlanRouteFromStop && (
          <M3Pressable
            style={styles.secondaryOriginBtn}
            onPress={() => {
              Haptics.selectionAsync();
              onPlanRouteFromStop(stop);
            }}
          >
            <Ionicons name="navigate-outline" size={16} color="#383139" />
            <Text style={styles.secondaryOriginBtnText}>Partir daqui</Text>
          </M3Pressable>
        )}
      </View>
    </M3BottomSheetWrapper>
  );
};

const styles = StyleSheet.create({
  sheetContainer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 24,
    backgroundColor: '#fffdf7',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    borderTopWidth: 2,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderColor: '#ffffff',
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1.5,
    borderBottomColor: '#ffffff',
    gap: 12,
  },
  busIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: '#ded0f9',
    borderWidth: 1.5,
    borderColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stopNameText: {
    color: '#383139',
    fontSize: 16,
    fontWeight: '800',
    flexShrink: 1,
  },
  stopCodePill: {
    backgroundColor: '#fffdf7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  stopCodePillText: {
    color: '#383139',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  subtitleText: {
    color: '#48404b',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 3,
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    backgroundColor: '#fffdf7',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  contentWrap: {
    marginTop: 14,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    color: '#383139',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  livePulseDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#f6a3ca',
  },
  arrivalsList: {
    maxHeight: 250,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  emptyText: {
    color: '#48404b',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 18,
  },
  arrivalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffdf7',
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  routeBadge: {
    minWidth: 48,
    height: 30,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#ffffff',
    backgroundColor: '#f9e7a8',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  routeBadgeText: {
    color: '#383139',
    fontSize: 13,
    fontWeight: '800',
  },
  headsignText: {
    color: '#383139',
    fontSize: 13,
    fontWeight: '700',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
  },
  statusSubText: {
    color: '#48404b',
    fontSize: 11,
    fontWeight: '500',
  },
  timeBadgeWrap: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  timeMinutesText: {
    color: '#383139',
    fontSize: 14,
    fontWeight: '800',
  },
  timeMinutesDue: {
    color: '#383139',
  },
  footerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
  },
  primaryNavigateBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f6a3ca',
    paddingVertical: 13,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    gap: 8,
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  primaryNavigateBtnText: {
    color: '#383139',
    fontSize: 14,
    fontWeight: '800',
  },
  secondaryOriginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ded0f9',
    borderWidth: 1.5,
    borderColor: '#ffffff',
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 999,
    gap: 6,
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  secondaryOriginBtnText: {
    color: '#383139',
    fontSize: 13,
    fontWeight: '800',
  },
});
