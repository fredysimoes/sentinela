import { Alert } from 'react-native';
import { Contact, requestPermissionsAsync } from 'expo-contacts';

export interface PickedContactResult {
  name: string;
  phone: string;
}

export interface DeviceContactItem {
  id: string;
  name: string;
  phone: string;
}

/**
 * Loads device contacts directly without relying on Android ACTION_PICK intent,
 * preventing phones (like Xiaomi, Samsung, etc.) from wrongly routing to the file manager.
 */
export async function loadDeviceContactsList(): Promise<DeviceContactItem[]> {
  try {
    const { status } = await requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permissão de Contactos',
        'O Sentinela necessita de aceder aos seus contactos para selecionar os números de emergência para onde enviar SMS e WhatsApp em caso de SOS.'
      );
      return [];
    }

    // 1. Try legacy getContactsAsync (returns all contacts with phone numbers at once)
    try {
      const { getContactsAsync, Fields } = await import('expo-contacts/legacy');
      const response = await getContactsAsync({
        fields: [Fields.Name, Fields.PhoneNumbers],
      });

      if (response && response.data && response.data.length > 0) {
        const list: DeviceContactItem[] = [];
        for (const item of response.data) {
          const phones = item.phoneNumbers || [];
          const validPhone = phones.find((p) => p.number && p.number.trim().length >= 4);
          if (validPhone && validPhone.number) {
            const rawName =
              item.name ||
              [item.firstName, item.lastName].filter(Boolean).join(' ') ||
              'Contacto';

            list.push({
              id: item.id || `c-${Math.random()}`,
              name: rawName.trim(),
              phone: validPhone.number.trim(),
            });
          }
        }

        if (list.length > 0) {
          return list.sort((a, b) => a.name.localeCompare(b.name));
        }
      }
    } catch (legacyErr) {
      console.warn('Erro ao carregar contactos via legacy:', legacyErr);
    }

    // 2. Fallback to modern SDK 58 Contact.getAll
    try {
      const contacts = await Contact.getAll();
      const list: DeviceContactItem[] = [];
      for (const c of contacts) {
        const phones = await c.getPhones().catch(() => []);
        const validPhone = phones.find((p) => p.number && p.number.trim().length >= 4);
        if (validPhone && validPhone.number) {
          const rawName = (await c.getFullName().catch(() => '')) || 'Contacto';
          list.push({
            id: c.id || `c-${Math.random()}`,
            name: rawName.trim(),
            phone: validPhone.number.trim(),
          });
        }
      }
      return list.sort((a, b) => a.name.localeCompare(b.name));
    } catch (modernErr) {
      console.warn('Erro ao carregar contactos via modern:', modernErr);
    }

    return [];
  } catch (err) {
    console.error('Erro global ao obter contactos do dispositivo:', err);
    return [];
  }
}
