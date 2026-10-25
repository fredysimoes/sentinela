import { Alert, Platform } from 'react-native';
import { Contact, requestPermissionsAsync, ContactField } from 'expo-contacts';

export interface PickedContactResult {
  name: string;
  phone: string;
}

/**
 * Robust cross-platform contact picker for Expo SDK 58.
 * Uses modern Contact.presentPicker() with graceful fallback to legacy or manual input.
 */
export async function pickContactFromDevice(): Promise<PickedContactResult | null> {
  try {
    const { status } = await requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permissão de Contactos',
        'O Sentinela necessita de aceder aos seus contactos para selecionar os números de emergência para onde enviar SMS e WhatsApp em caso de SOS.'
      );
      return null;
    }

    // 1. Try modern Expo SDK 58 Contact.presentPicker()
    try {
      const picked = await Contact.presentPicker();
      if (!picked) {
        // User voluntarily dismissed or cancelled the picker
        return null;
      }

      // Fetch phone numbers from selected contact
      let phones = await picked.getPhones().catch(() => []);
      let rawPhone = phones[0]?.number;

      // If phones array was empty from getter, try getDetails
      if (!rawPhone) {
        try {
          const details = await picked.getDetails([ContactField.PHONES]);
          if (details?.phones && details.phones.length > 0) {
            rawPhone = details.phones[0].number;
          }
        } catch (_) {}
      }

      if (!rawPhone) {
        Alert.alert(
          'Contacto Sem Telefone',
          'O contacto selecionado não possui nenhum número de telefone associado.'
        );
        return null;
      }

      let rawName = '';
      try {
        rawName = await picked.getFullName();
      } catch (_) {}

      if (!rawName) {
        try {
          const given = (await picked.getGivenName()) || '';
          const family = (await picked.getFamilyName()) || '';
          rawName = `${given} ${family}`.trim();
        } catch (_) {}
      }

      if (!rawName) {
        rawName = 'Contacto Pessoal';
      }

      return {
        name: rawName.trim(),
        phone: rawPhone.trim(),
      };
    } catch (pickerErr: any) {
      console.warn('Contact.presentPicker falhou, a tentar legado:', pickerErr);
    }

    // 2. Fallback to legacy expo-contacts/legacy if modern method encountered native issue
    try {
      const legacyContacts = await import('expo-contacts/legacy');
      const legacyPicked = await legacyContacts.presentContactPickerAsync();
      if (!legacyPicked) {
        return null;
      }

      const phoneNumbers = legacyPicked.phoneNumbers || [];
      if (phoneNumbers.length === 0 || !phoneNumbers[0]?.number) {
        Alert.alert(
          'Contacto Sem Telefone',
          'O contacto selecionado não tem nenhum número de telefone associado.'
        );
        return null;
      }

      const rawName =
        legacyPicked.name ||
        [legacyPicked.firstName, legacyPicked.lastName].filter(Boolean).join(' ') ||
        'Contacto Pessoal';

      return {
        name: rawName.trim(),
        phone: phoneNumbers[0].number.trim(),
      };
    } catch (legacyErr: any) {
      console.warn('expo-contacts/legacy também falhou:', legacyErr);
    }

    // If both failed, alert user that they can enter details manually in the form
    Alert.alert(
      'Contactos',
      'Não foi possível abrir o seletor nativo no seu dispositivo. Pode adicionar o contacto diretamente preenchendo os campos abaixo.'
    );
    return null;
  } catch (err: any) {
    console.error('Erro global ao aceder aos contactos:', err);
    Alert.alert(
      'Contactos',
      'Não foi possível aceder à lista de contactos. Pode introduzir o número manualmente.'
    );
    return null;
  }
}
