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
    paddingTop: 10,
    paddingBottom: 24,
    backgroundColor: '#f5f4ee',
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderColor: '#000000',
    shadowColor: '#000000',
    shadowOffset: { width: 4, height: -4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 3,
    borderBottomColor: '#000000',
    gap: 12,
  },
  busIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 0,
    backgroundColor: '#ffff00',
    borderWidth: 3,
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stopNameText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '900',
    textTransform: 'uppercase',
    flexShrink: 1,
  },
  stopCodePill: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 0,
    borderWidth: 2,
    borderColor: '#000000',
  },
  stopCodePillText: {
    color: '#000000',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  subtitleText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 3,
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 0,
    borderWidth: 2,
    borderColor: '#000000',
    backgroundColor: '#ffffff',
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
    color: '#000000',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  livePulseDot: {
    width: 8,
    height: 8,
    borderRadius: 0,
    backgroundColor: '#ff0000',
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
    color: '#000000',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 18,
  },
  arrivalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 0,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    borderWidth: 2.5,
    borderColor: '#000000',
    shadowColor: '#000000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  routeBadge: {
    minWidth: 48,
    height: 28,
    borderRadius: 0,
    borderWidth: 2,
    borderColor: '#000000',
    backgroundColor: '#ffff00',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  routeBadgeText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '900',
  },
  headsignText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '800',
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
    borderRadius: 0,
  },
  statusSubText: {
    color: '#000000',
    fontSize: 11,
    fontWeight: '600',
  },
  timeBadgeWrap: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  timeMinutesText: {
    color: '#ff0000',
    fontSize: 14,
    fontWeight: '900',
  },
  timeMinutesDue: {
    color: '#000000',
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
    backgroundColor: '#ff0000',
    paddingVertical: 13,
    borderRadius: 0,
    borderWidth: 3,
    borderColor: '#000000',
    gap: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  primaryNavigateBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  secondaryOriginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 2.5,
    borderColor: '#000000',
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 0,
    gap: 6,
  },
  secondaryOriginBtnText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
});
