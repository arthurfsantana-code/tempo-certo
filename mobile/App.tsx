import { StatusBar } from 'expo-status-bar'
import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'

const PLACE = { name: 'São Paulo', lat: -23.55, lon: -46.63 }

const ICONS: Record<number, string> = {
  0: '☀', 1: '🌤', 2: '⛅', 3: '☁', 45: '≋', 48: '≋',
  51: '🌦', 61: '🌧', 63: '🌧', 65: '🌧', 80: '🌦',
  81: '🌧', 82: '🌧', 95: '⛈',
}

const DESCRIPTION: Record<number, string> = {
  0: 'Céu limpo', 1: 'Poucas nuvens', 2: 'Parcialmente nublado',
  3: 'Nublado', 45: 'Neblina', 48: 'Neblina',
  51: 'Garoa', 61: 'Chuva leve', 63: 'Chuva', 65: 'Chuva forte',
  80: 'Pancadas de chuva', 81: 'Pancadas de chuva',
  82: 'Pancadas fortes', 95: 'Trovoadas',
}

export default function App() {
  const [place, setPlace] = useState(PLACE)
  const [query, setQuery] = useState('')
  const [cities, setCities] = useState<any[]>([])
  const [weather, setWeather] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadWeather(PLACE)
  }, [])

  useEffect(() => {
    if (query.length < 2) {
      setCities([])
      return
    }

    const timer = setTimeout(searchCities, 400)
    return () => clearTimeout(timer)
  }, [query])

  async function searchCities() {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=pt`
    const response = await fetch(url)
    const data = await response.json()
    setCities(data.results || [])
  }

  async function loadWeather(selected: any) {
    setLoading(true)
    setCities([])
    setQuery('')

    const params = new URLSearchParams({
      latitude: String(selected.lat),
      longitude: String(selected.lon),
      current: 'temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m',
      hourly: 'temperature_2m,precipitation_probability,weather_code',
      daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
      timezone: 'auto',
      forecast_days: '7',
    })

    try {
      const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`)
      const data = await response.json()
      setPlace({ name: selected.name, lat: selected.lat, lon: selected.lon })
      setWeather(data)
    } catch {
      setWeather(null)
    } finally {
      setLoading(false)
    }
  }

  function selectCity(city: any) {
    loadWeather({ name: city.name, lat: city.latitude, lon: city.longitude })
  }

  function timeLabel(iso: string) {
    return iso.slice(11, 16)
  }

  function dayLabel(date: string, index: number) {
    if (index === 0) return 'Hoje'
    if (index === 1) return 'Amanhã'
    return new Date(`${date}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'short' })
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <Text style={styles.title}>Tempo Certo</Text>
      </View>

      <View style={styles.searchBox}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Buscar cidade"
          placeholderTextColor="#8A969E"
          style={styles.input}
        />
      </View>

      {cities.length > 0 && (
        <View style={styles.cities}>
          {cities.map((city) => (
            <Pressable
              key={`${city.latitude}-${city.longitude}`}
              onPress={() => selectCity(city)}
              style={styles.city}
            >
              <Text style={styles.cityName}>{city.name}</Text>
              <Text style={styles.cityRegion}>{city.admin1 || city.country}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#E58A45" />
        </View>
      ) : weather ? (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.card}>
            <Text style={styles.cityTitle}>{place.name}</Text>

            <View style={styles.current}>
              <Text style={styles.mainIcon}>{ICONS[weather.current.weather_code] || '☁'}</Text>
              <View>
                <Text style={styles.temperature}>{Math.round(weather.current.temperature_2m)}°</Text>
                <Text style={styles.description}>{DESCRIPTION[weather.current.weather_code] || 'Nublado'}</Text>
              </View>
            </View>

            <View style={styles.hilo}>
              <Text style={styles.detailText}>Máx {Math.round(weather.daily.temperature_2m_max[0])}°</Text>
              <Text style={styles.detailText}>Mín {Math.round(weather.daily.temperature_2m_min[0])}°</Text>
            </View>
          </View>

          <View style={styles.details}>
            <View style={styles.detailCard}>
              <Text style={styles.detailLabel}>Umidade</Text>
              <Text style={styles.detailValue}>{weather.current.relative_humidity_2m}%</Text>
            </View>
            <View style={styles.detailCard}>
              <Text style={styles.detailLabel}>Vento</Text>
              <Text style={styles.detailValue}>{Math.round(weather.current.wind_speed_10m)} km/h</Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Próximas horas</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {weather.hourly.time.slice(0, 12).map((time: string, index: number) => (
                <View key={time} style={styles.hour}>
                  <Text style={styles.hourTime}>{index === 0 ? 'Agora' : timeLabel(time)}</Text>
                  <Text style={styles.hourIcon}>{ICONS[weather.hourly.weather_code[index]] || '☁'}</Text>
                  <Text style={styles.hourTemp}>{Math.round(weather.hourly.temperature_2m[index])}°</Text>
                </View>
              ))}
            </ScrollView>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Próximos dias</Text>
            {weather.daily.time.map((date: string, index: number) => (
              <View key={date} style={styles.day}>
                <Text style={styles.dayName}>{dayLabel(date, index)}</Text>
                <Text style={styles.dayIcon}>{ICONS[weather.daily.weather_code[index]] || '☁'}</Text>
                <Text style={styles.dayTemp}>{Math.round(weather.daily.temperature_2m_min[index])}°</Text>
                <View style={styles.bar}>
                  <View style={styles.barFill} />
                </View>
                <Text style={styles.dayTemp}>{Math.round(weather.daily.temperature_2m_max[index])}°</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      ) : (
        <View style={styles.center}>
          <Text style={styles.error}>Não foi possível carregar o clima.</Text>
          <Pressable style={styles.retry} onPress={() => loadWeather(place)}>
            <Text style={styles.retryText}>Tentar novamente</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#EEF2F4' },
  header: { height: 58, justifyContent: 'center', paddingHorizontal: 20 },
  title: { color: '#17253A', fontSize: 21, fontWeight: '800' },
  searchBox: { marginHorizontal: 20, height: 46, borderRadius: 12, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#DEE5E9', zIndex: 20 },
  input: { flex: 1, paddingHorizontal: 14, color: '#17253A' },
  cities: { position: 'absolute', top: 104, left: 20, right: 20, backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1, borderColor: '#DEE5E9', zIndex: 30, elevation: 8 },
  city: { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#EDF1F3' },
  cityName: { color: '#17253A', fontSize: 15, fontWeight: '700' },
  cityRegion: { color: '#7B8794', fontSize: 12, marginTop: 2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 20, gap: 12 },
  card: { backgroundColor: '#FFF', borderRadius: 16, borderWidth: 1, borderColor: '#DEE5E9', padding: 16 },
  cityTitle: { color: '#17253A', fontSize: 22, fontWeight: '800' },
  current: { flexDirection: 'row', alignItems: 'center', marginTop: 14 },
  mainIcon: { width: 92, textAlign: 'center', fontSize: 64, color: '#E58A45' },
  temperature: { color: '#17253A', fontSize: 62, lineHeight: 66, fontWeight: '800' },
  description: { color: '#17253A', fontSize: 15, fontWeight: '600' },
  hilo: { flexDirection: 'row', justifyContent: 'flex-end', gap: 16, marginTop: 10 },
  detailText: { color: '#17253A', fontWeight: '700' },
  details: { flexDirection: 'row', gap: 12 },
  detailCard: { flex: 1, height: 68, borderRadius: 14, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#DEE5E9', justifyContent: 'center', paddingHorizontal: 12 },
  detailLabel: { color: '#7B8794', fontSize: 11, textTransform: 'uppercase' },
  detailValue: { color: '#17253A', fontSize: 14, fontWeight: '800', marginTop: 4 },
  sectionTitle: { color: '#17253A', fontSize: 15, fontWeight: '800', marginBottom: 10 },
  hour: { width: 64, height: 105, marginRight: 8, borderRadius: 12, backgroundColor: '#F4F7F8', alignItems: 'center', justifyContent: 'space-evenly' },
  hourTime: { color: '#7B8794', fontSize: 11 },
  hourIcon: { fontSize: 24 },
  hourTemp: { color: '#17253A', fontWeight: '800' },
  day: { height: 52, borderTopWidth: 1, borderTopColor: '#EDF1F3', flexDirection: 'row', alignItems: 'center' },
  dayName: { width: 78, color: '#17253A', fontWeight: '700', textTransform: 'capitalize' },
  dayIcon: { width: 36, fontSize: 20 },
  dayTemp: { width: 34, color: '#17253A', textAlign: 'center', fontWeight: '700' },
  bar: { flex: 1, height: 5, marginHorizontal: 8, borderRadius: 3, backgroundColor: '#E7ECF0' },
  barFill: { width: '70%', height: 5, borderRadius: 3, backgroundColor: '#E58A45' },
  error: { color: '#17253A', marginBottom: 12 },
  retry: { height: 42, borderRadius: 10, backgroundColor: '#17253A', paddingHorizontal: 16, justifyContent: 'center' },
  retryText: { color: '#FFF', fontWeight: '700' },
})
