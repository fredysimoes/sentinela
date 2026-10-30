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
          <Ionicons name="walk" size={17} color="#FFFFFF" />
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
            <Ionicons name="navigate-outline" size={16} color="#38BDF8" />
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
    paddingTop: 8,
    paddingBottom: 24,
    backgroundColor: '#11151C',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E2532',
    gap: 12,
  },
  busIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stopNameText: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
    flexShrink: 1,
  },
  stopCodePill: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  stopCodePillText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  subtitleText: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 3,
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E2532',
    justifyContent: 'center',
    alignItems: 'center',
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
    color: '#CBD5E1',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  livePulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#10B981',
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
    color: '#94A3B8',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  arrivalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#181E29',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#242C3C',
  },
  routeBadge: {
    minWidth: 48,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#0284C7',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  routeBadgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  headsignText: {
    color: '#F1F5F9',
    fontSize: 13,
    fontWeight: '600',
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
    borderRadius: 3,
  },
  statusSubText: {
    color: '#94A3B8',
    fontSize: 11,
  },
  timeBadgeWrap: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  timeMinutesText: {
    color: '#38BDF8',
    fontSize: 14,
    fontWeight: '800',
  },
  timeMinutesDue: {
    color: '#10B981',
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
    backgroundColor: '#10B981',
    paddingVertical: 13,
    borderRadius: M3Shapes.full,
    gap: 8,
    ...M3Elevation.level2,
  },
  primaryNavigateBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryOriginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderWidth: 1.5,
    borderColor: '#38BDF8',
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: M3Shapes.full,
    gap: 6,
  },
  secondaryOriginBtnText: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '700',
  },
});
