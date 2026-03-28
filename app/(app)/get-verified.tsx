import {
  View, Text, TextInput, Pressable, StyleSheet,
  ActivityIndicator, ScrollView, Modal, FlatList, Alert,
} from 'react-native';
import DocumentCamera from '../../src/components/DocumentCamera';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import { useAuth } from '../../src/hooks/useAuth';
import { useLanguage } from '../../src/hooks/useLanguage';
import {
  verificationService,
  buildIdDescription,
  appendVerificationMetadata,
  mapOcrToFormData,
  VerificationError,
} from '../../src/api/verification.service';
import { FileAttachmentTypeId, type CountryInfo, type CountryIdentificationType, type VerificationFormData } from '../../src/types/verification.types';
import { colors, spacing, typography, radius } from '../../src/theme';

type Step = 'id-front' | 'selfie' | 'details' | 'submitting' | 'done';

const GENDER_OPTIONS = [
  { id: 1, label: 'Male' },
  { id: 2, label: 'Female' },
  { id: 3, label: 'Other' },
];

const emptyForm: VerificationFormData = {
  countryOfIssuance: '',
  idType: '',
  idNumber: '',
  firstName: '',
  middleName: '',
  lastName: '',
  nationality: '',
  dateOfBirth: '',
  placeOfBirth: '',
  genderTypeId: 0,
  issuerName: '',
  issuanceDate: '',
  expirationDate: '',
};

export default function GetVerifiedScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useLanguage();

  const [step, setStep] = useState<Step>('id-front');
  const [showDocCamera, setShowDocCamera] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  // Uploaded file IDs
  const [frontFileId, setFrontFileId] = useState('');
  const [selfieFileId, setSelfieFileId] = useState('');

  // VLink result shown on done screen
  const [vlinkId, setVlinkId] = useState('');
  const [vlinkReference, setVlinkReference] = useState('');
  const [vlinkUrl, setVlinkUrl] = useState('');

  // Form data (OCR pre-filled from front upload)
  const [form, setForm] = useState<VerificationFormData>(emptyForm);

  // Pickers
  const [countries, setCountries] = useState<CountryInfo[]>([]);
  const [idTypes, setIdTypes] = useState<CountryIdentificationType[]>([]);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [showIdTypePicker, setShowIdTypePicker] = useState(false);
  const [showGenderPicker, setShowGenderPicker] = useState(false);
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [loadingIdTypes, setLoadingIdTypes] = useState(false);

  const set = (field: keyof VerificationFormData) => (value: string | number) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  // In GPWeb, the customerId is the organizationId from user settings
  const resolvedCustomerId = user?.organizationId ?? '';

  // Load countries when entering step 3
  useEffect(() => {
    if (step !== 'details') return;
    setLoadingCountries(true);
    verificationService.getCountryList()
      .then(setCountries)
      .catch(() => setError('Could not load country list.'))
      .finally(() => setLoadingCountries(false));
  }, [step]);

  // Load ID types when country of issuance changes
  useEffect(() => {
    if (!form.countryOfIssuance) { setIdTypes([]); return; }
    setLoadingIdTypes(true);
    verificationService.getIdTypes(form.countryOfIssuance)
      .then(setIdTypes)
      .catch(() => setIdTypes([]))
      .finally(() => setLoadingIdTypes(false));
  }, [form.countryOfIssuance]);

  const requestPermission = async (type: 'camera' | 'library'): Promise<boolean> => {
    if (type === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Camera access is required to take photos.');
        return false;
      }
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Photo library access is required.');
        return false;
      }
    }
    return true;
  };

  const pickImage = async (source: 'camera' | 'library', frontCamera = false): Promise<string | null> => {
    const permType = source === 'camera' ? 'camera' : 'library';
    if (!(await requestPermission(permType))) return null;

    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      quality: 0.85,
      base64: true,
      // For documents (not selfie): enable crop overlay locked to landscape 3:2
      // This covers passport data pages (~1.42:1) and standard ID-1 cards (~1.58:1)
      allowsEditing: !frontCamera,
      aspect: frontCamera ? undefined : ([3, 2] as [number, number]),
      ...(source === 'camera' ? { cameraType: frontCamera ? ImagePicker.CameraType.front : ImagePicker.CameraType.back } : {}),
    };

    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);

    if (result.canceled || !result.assets?.[0]?.base64) return null;
    return result.assets[0].base64;
  };

  const extractApiError = (err: unknown): string => {
    if (err instanceof VerificationError) return err.message;
    const data = (err as any)?.response?.data;
    if (data?.problems?.[0]?.messageDetails) return data.problems[0].messageDetails;
    if (data?.problems?.[0]?.message) return data.problems[0].message;
    return 'Upload failed. Please try again.';
  };

  // Shared upload logic for ID front — called from both camera and library paths
  const uploadIdFrontBase64 = async (base64: string) => {
    const customerId = resolvedCustomerId;
    if (!customerId) { setError('User customer ID not found. Please log in again.'); return; }
    setUploading(true);
    console.log('[KYC] Uploading ID front, customerId:', customerId);
    try {
      const result = await verificationService.uploadFile({
        ParentObjectId: customerId,
        ParentObjectTypeId: 21,
        SourceIP: '',
        FileAttachmentTypeId: FileAttachmentTypeId.ProofOfIdentityFront,
        FileAttachmentSubTypeId: 0,
        SumSubTypeId: 0,
        FileName: `id_front_${Date.now()}.jpg`,
        GroupName: '',
        Properties: null,
        IsPrimary: true,
        ContainsFront: true,
        ContainsBack: false,
        ViewableByBanker: true,
        ViewableByCustomer: true,
        DeletableByCustomer: false,
        Description: 'documentType: Proof of Identity',
        BypassFileAnalysis: false,
        FileData: base64,
      });

      console.log('[KYC] ID front uploaded:', result.FileAttachmentId);
      setFrontFileId(result.FileAttachmentId);

      if (result.Properties) {
        const ocr = mapOcrToFormData(result.Properties);
        setForm((prev) => ({
          ...prev,
          ...ocr,
          firstName: prev.firstName || user?.firstName || '',
          lastName: prev.lastName || user?.lastName || '',
        }));
      } else {
        setForm((prev) => ({
          ...prev,
          firstName: prev.firstName || user?.firstName || '',
          lastName: prev.lastName || user?.lastName || '',
        }));
      }

      setStep('selfie');
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setUploading(false);
    }
  };

  const handleUploadIdFront = async (source: 'camera' | 'library') => {
    setError('');
    if (source === 'camera') {
      // Open the live document camera overlay instead of the system camera
      setShowDocCamera(true);
      return;
    }
    const base64 = await pickImage('library', false);
    if (!base64) return;
    await uploadIdFrontBase64(base64);
  };

  const handleDocCameraCapture = async (base64: string) => {
    setShowDocCamera(false);
    await uploadIdFrontBase64(base64);
  };

  const handleUploadSelfie = async (source: 'camera' | 'library') => {
    setError('');
    const customerId = resolvedCustomerId;
    if (!customerId) { setError('User customer ID not found.'); return; }

    const base64 = await pickImage(source, source === 'camera');
    if (!base64) return;

    setUploading(true);
    try {
      const result = await verificationService.uploadFile({
        ParentObjectId: customerId,
        ParentObjectTypeId: 21,
        SourceIP: '',
        FileAttachmentTypeId: FileAttachmentTypeId.SelfiePhoto,
        FileAttachmentSubTypeId: 0,
        SumSubTypeId: 0,
        FileName: `selfie_${Date.now()}.jpg`,
        GroupName: '',
        Properties: null,
        IsPrimary: true,
        ContainsFront: false,
        ContainsBack: false,
        ViewableByBanker: true,
        ViewableByCustomer: true,
        DeletableByCustomer: false,
        Description: 'Selfie Photo',
        BypassFileAnalysis: false,
        FileData: base64,
      });

      console.log('[KYC] Selfie uploaded:', result.FileAttachmentId);
      setSelfieFileId(result.FileAttachmentId);
      setStep('details');
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setUploading(false);
    }
  };

  const validateDetails = (): string | null => {
    if (!form.firstName.trim()) return 'First name is required.';
    if (!form.lastName.trim()) return 'Last name is required.';
    if (!form.countryOfIssuance) return 'Country of issuance is required.';
    if (!form.idType) return 'ID type is required.';
    if (!form.idNumber.trim()) return 'ID number is required.';
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validateDetails();
    if (validationError) { setError(validationError); return; }

    const customerId = resolvedCustomerId;
    const userId = user?.userId ?? (user as any)?.UserId ?? '';
    const userName = user?.userName ?? '';
    const fullName = `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim();

    if (!customerId || !userId) { setError('User data not available. Please log in again.'); return; }

    setError('');
    setStep('submitting');

    try {
      const customerName = fullName || userName;
      const verifyUrl = `https://fx.worldkyc.com/verify/${customerId}`;

      // 1. Create verified link
      const vlink = await verificationService.createVerifiedLink({
        VerifiedLinkTypeId: 3,
        VerifiedLinkName: customerName,
        CustomerId: customerId,
        GroupName: '',
        MinimumWKYCLevel: 0,
        Message: `Identity verification request for ${customerName}`,
        PublicMessage: '',
        BlockchainMessage: '',
        SharedWithName: '',
        WebsiteUrl: '',
        VerifiedLinkUrl: '',
        VerifiedLinkShortUrl: '',
        SelectedAccountAlias: '',
        ShareAccountAlias: false,
        ShareBirthCity: true,
        ShareBirthCountry: true,
        ShareBirthDate: true,
        ShareFirstName: true,
        ShareMiddleName: true,
        ShareLastName: true,
        ShareGender: true,
        ShareNationality: true,
        ShareIdExpirationDate: true,
        ShareIdNumber: true,
        ShareIdType: true,
        ShareIdFront: true,
        ShareIdBack: true,
        ShareSelfie: true,
        IsPrimary: true,
      });

      console.log('[KYC] VLink created:', vlink.VerifiedLinkId, vlink.VerifiedLinkReference);

      // 2. Update VLink with the verify URL and all share settings
      const vlinkVerifyUrl = `https://fx.worldkyc.com/verify/${vlink.VerifiedLinkReference}`;
      await verificationService.updateVerifiedLink({
        VerifiedLinkId: vlink.VerifiedLinkId,
        VerifiedLinkTypeId: 3,
        VerifiedLinkName: customerName,
        GroupName: '',
        MinimumWKYCLevel: 0,
        Message: `Identity verification request for ${customerName}`,
        PublicMessage: '',
        BlockchainMessage: '',
        SharedWithName: '',
        WebsiteUrl: '',
        VerifiedLinkUrl: vlinkVerifyUrl,
        VerifiedLinkShortUrl: vlinkVerifyUrl,
        SelectedAccountAlias: '',
        AgeConfirmOver: 0,
        AgeConfirmUnder: 0,
        ShareAccountAlias: false,
        ShareBirthCity: true,
        ShareBirthCountry: true,
        ShareBirthDate: true,
        ShareFirstName: true,
        ShareMiddleName: true,
        ShareLastName: true,
        ShareGlobalFirstName: false,
        ShareGlobalMiddleName: false,
        ShareGlobalLastName: false,
        ShareGender: true,
        ShareNationality: true,
        ShareSuffix: false,
        ShareIdExpirationDate: true,
        ShareIdNumber: true,
        ShareIdType: true,
        ShareIdFront: true,
        ShareIdBack: true,
        ShareSelfie: true,
        ShareAgeConfirmOver: false,
        ShareAgeConfirmUnder: false,
        AdditionalData: '',
        IsWalletLocked: false,
        WalletAddress: '',
        TokenId: '',
        NFTReference: '',
        NFTChain: '',
        IsPrimary: true,
      });

      console.log('[KYC] VLink updated with URL:', vlinkVerifyUrl);

      // 3. Attach metadata to ID front file
      const baseDesc = buildIdDescription(form);
      const fullDesc = appendVerificationMetadata(
        baseDesc,
        userId,
        userName,
        fullName,
        vlink.VerifiedLinkId,
        vlink.VerifiedLinkReference,
      );

      await verificationService.updateFileAttachment({
        FileAttachmentId: frontFileId,
        GroupName: '',
        FileAttachmentTypeId: FileAttachmentTypeId.ProofOfIdentityFront,
        ViewableByBanker: true,
        ViewableByCustomer: true,
        DeletableByCustomer: false,
        Description: fullDesc,
      });

      console.log('[KYC] File attachment updated with metadata');
      setVlinkId(vlink.VerifiedLinkId);
      setVlinkReference(vlink.VerifiedLinkReference);
      setVlinkUrl(vlinkVerifyUrl);
      setStep('done');
    } catch (err) {
      const msg = err instanceof VerificationError ? err.message : 'Submission failed. Please try again.';
      setError(msg);
      setStep('details');
    }
  };

  const selectedCountry = countries.find((c) => (c.CountryCode || c.countryCode) === form.countryOfIssuance);
  const selectedIdType = idTypes.find((t) => t.CountryIdentificationTypeName === form.idType);
  const selectedGender = GENDER_OPTIONS.find((g) => g.id === form.genderTypeId);

  // ─── Step: ID Front ───────────────────────────────────────────────────────
  if (step === 'id-front') {
    return (
      <View style={{ flex: 1 }}>
        {/* Full-screen live document camera overlay */}
        <Modal visible={showDocCamera} animationType="slide" statusBarTranslucent>
          <DocumentCamera
            onCapture={handleDocCameraCapture}
            onClose={() => setShowDocCamera(false)}
          />
        </Modal>

        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
          <Text style={styles.title}>{t('verification.title') || 'Get Verified'}</Text>
          <Text style={styles.stepLabel}>{t('verification.step1Label') || 'Step 1 of 3'}</Text>
          <Text style={styles.stepTitle}>{t('verification.step1Title') || 'Upload ID Document'}</Text>
          <Text style={styles.stepDesc}>{t('verification.step1Hint') || 'Take a clear photo of the front of your government-issued ID.'}</Text>

          {!!error && <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>}

          {uploading ? (
            <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
          ) : (
            <View style={styles.card}>
              <Pressable style={styles.uploadBtn} onPress={() => handleUploadIdFront('camera')}>
                <Text style={styles.uploadBtnText}>📷  {t('verification.takePhoto') || 'Take Photo'}</Text>
              </Pressable>
              <Pressable style={[styles.uploadBtn, styles.uploadBtnAlt]} onPress={() => handleUploadIdFront('library')}>
                <Text style={styles.uploadBtnText}>🖼  {t('verification.chooseLibrary') || 'Choose from Library'}</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  // ─── Step: Selfie ─────────────────────────────────────────────────────────
  if (step === 'selfie') {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>{t('verification.title') || 'Get Verified'}</Text>
        <Text style={styles.stepLabel}>{t('verification.step2Label') || 'Step 2 of 3'}</Text>
        <Text style={styles.stepTitle}>{t('verification.step2Title') || 'Take a Selfie'}</Text>
        <Text style={styles.stepDesc}>{t('verification.step2Hint') || 'Take a clear selfie. Make sure you are in good lighting.'}</Text>

        {!!error && <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>}

        {uploading ? (
          <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
        ) : (
          <View style={styles.card}>
            <Pressable style={styles.uploadBtn} onPress={() => handleUploadSelfie('camera')}>
              <Text style={styles.uploadBtnText}>🤳  {t('verification.takeSelfie') || 'Take Selfie'}</Text>
            </Pressable>
            <Pressable style={[styles.uploadBtn, styles.uploadBtnAlt]} onPress={() => handleUploadSelfie('library')}>
              <Text style={styles.uploadBtnText}>🖼  {t('verification.chooseLibrary') || 'Choose from Library'}</Text>
            </Pressable>
            <Pressable style={styles.backBtn} onPress={() => setStep('id-front')}>
              <Text style={styles.backBtnText}>← {t('common.back') || 'Back'}</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    );
  }

  // ─── Step: Details form ───────────────────────────────────────────────────
  if (step === 'details') {
    return (
      <>
        <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>{t('verification.title') || 'Get Verified'}</Text>
          <Text style={styles.stepLabel}>{t('verification.step3Label') || 'Step 3 of 3'}</Text>
          <Text style={styles.stepTitle}>{t('verification.step3Title') || 'Your Details'}</Text>
          <Text style={styles.stepDesc}>{t('verification.step3Hint') || 'Please confirm your information. Fields marked * are required.'}</Text>

          {!!error && <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>}

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{t('verification.personalInfo') || 'Personal Information'}</Text>

            <Text style={styles.label}>{t('verification.firstName') || 'First Name'} *</Text>
            <TextInput style={styles.input} value={form.firstName} onChangeText={set('firstName')}
              placeholder={t('verification.firstName') || 'First name'} placeholderTextColor={colors.textMuted} autoCapitalize="words" />

            <Text style={styles.label}>{t('verification.middleName') || 'Middle Name'}</Text>
            <TextInput style={styles.input} value={form.middleName} onChangeText={set('middleName')}
              placeholder={t('verification.middleName') || 'Middle name (optional)'} placeholderTextColor={colors.textMuted} autoCapitalize="words" />

            <Text style={styles.label}>{t('verification.lastName') || 'Last Name'} *</Text>
            <TextInput style={styles.input} value={form.lastName} onChangeText={set('lastName')}
              placeholder={t('verification.lastName') || 'Last name'} placeholderTextColor={colors.textMuted} autoCapitalize="words" />

            <Text style={styles.label}>{t('verification.nationality') || 'Nationality'}</Text>
            <TextInput style={styles.input} value={form.nationality} onChangeText={set('nationality')}
              placeholder="e.g. HK" placeholderTextColor={colors.textMuted} autoCapitalize="characters" />

            <Text style={styles.label}>{t('verification.dateOfBirth') || 'Date of Birth (YYYY-MM-DD)'}</Text>
            <TextInput style={styles.input} value={form.dateOfBirth} onChangeText={set('dateOfBirth')}
              placeholder="1990-01-31" placeholderTextColor={colors.textMuted} keyboardType="numeric" />

            <Text style={styles.label}>{t('verification.placeOfBirth') || 'Place of Birth'}</Text>
            <TextInput style={styles.input} value={form.placeOfBirth} onChangeText={set('placeOfBirth')}
              placeholder={t('verification.placeOfBirth') || 'City of birth'} placeholderTextColor={colors.textMuted} autoCapitalize="words" />

            <Text style={styles.label}>{t('verification.gender') || 'Gender'}</Text>
            <Pressable style={styles.pickerBtn} onPress={() => setShowGenderPicker(true)}>
              <Text style={styles.pickerValue}>{selectedGender?.label || 'Select gender'}</Text>
              <Text style={styles.chevron}>▾</Text>
            </Pressable>

            <Text style={styles.sectionTitle}>{t('verification.idDocument') || 'ID Document'}</Text>

            <Text style={styles.label}>{t('verification.countryOfIssuance') || 'Country of Issuance'} *</Text>
            {loadingCountries ? (
              <ActivityIndicator color={colors.primary} style={styles.miniLoader} />
            ) : (
              <Pressable style={styles.pickerBtn} onPress={() => setShowCountryPicker(true)}>
                <Text style={styles.pickerValue}>
                  {selectedCountry
                    ? (selectedCountry.CountryName || selectedCountry.countryName)
                    : (t('verification.selectCountry') || 'Select country')}
                </Text>
                <Text style={styles.chevron}>▾</Text>
              </Pressable>
            )}

            <Text style={styles.label}>{t('verification.idType') || 'ID Type'} *</Text>
            {loadingIdTypes ? (
              <ActivityIndicator color={colors.primary} style={styles.miniLoader} />
            ) : (
              <Pressable
                style={styles.pickerBtn}
                onPress={() => form.countryOfIssuance ? setShowIdTypePicker(true) : setError('Please select a country first.')}
              >
                <Text style={styles.pickerValue}>
                  {selectedIdType
                    ? (selectedIdType.CountryIdentificationTypeEnglishName || selectedIdType.CountryIdentificationTypeName)
                    : (t('verification.selectIdType') || 'Select ID type')}
                </Text>
                <Text style={styles.chevron}>▾</Text>
              </Pressable>
            )}

            <Text style={styles.label}>{t('verification.idNumber') || 'ID Number'} *</Text>
            <TextInput style={styles.input} value={form.idNumber} onChangeText={set('idNumber')}
              placeholder={t('verification.idNumber') || 'Document number'} placeholderTextColor={colors.textMuted}
              autoCapitalize="characters" autoCorrect={false} />

            <Text style={styles.label}>{t('verification.issuerName') || 'Issuing Authority'}</Text>
            <TextInput style={styles.input} value={form.issuerName} onChangeText={set('issuerName')}
              placeholder="e.g. Immigration Department" placeholderTextColor={colors.textMuted} autoCapitalize="words" />

            <Text style={styles.label}>{t('verification.issuanceDate') || 'Issue Date (YYYY-MM-DD)'}</Text>
            <TextInput style={styles.input} value={form.issuanceDate} onChangeText={set('issuanceDate')}
              placeholder="2020-01-01" placeholderTextColor={colors.textMuted} keyboardType="numeric" />

            <Text style={styles.label}>{t('verification.expirationDate') || 'Expiry Date (YYYY-MM-DD)'}</Text>
            <TextInput style={styles.input} value={form.expirationDate} onChangeText={set('expirationDate')}
              placeholder="2030-01-01" placeholderTextColor={colors.textMuted} keyboardType="numeric" />

            <Pressable style={styles.submitBtn} onPress={handleSubmit}>
              <Text style={styles.submitBtnText}>{t('verification.submit') || 'Submit Verification'}</Text>
            </Pressable>

            <Pressable style={styles.backBtn} onPress={() => setStep('selfie')}>
              <Text style={styles.backBtnText}>← {t('common.back') || 'Back'}</Text>
            </Pressable>
          </View>
        </ScrollView>

        {/* Country Picker */}
        <Modal visible={showCountryPicker} transparent animationType="fade">
          <Pressable style={styles.overlay} onPress={() => setShowCountryPicker(false)}>
            <View style={styles.modal}>
              <Text style={styles.modalTitle}>{t('verification.countryOfIssuance') || 'Country of Issuance'}</Text>
              <FlatList
                data={countries}
                keyExtractor={(item) => item.CountryCode || item.countryCode || ''}
                renderItem={({ item }) => {
                  const code = item.CountryCode || item.countryCode || '';
                  const name = item.CountryName || item.countryName || '';
                  return (
                    <Pressable
                      style={[styles.option, code === form.countryOfIssuance && styles.optionActive]}
                      onPress={() => {
                        set('countryOfIssuance')(code);
                        set('idType')('');
                        setShowCountryPicker(false);
                      }}
                    >
                      <Text style={styles.optionText}>{name}</Text>
                      <Text style={styles.optionSub}>{code}</Text>
                    </Pressable>
                  );
                }}
              />
            </View>
          </Pressable>
        </Modal>

        {/* ID Type Picker */}
        <Modal visible={showIdTypePicker} transparent animationType="fade">
          <Pressable style={styles.overlay} onPress={() => setShowIdTypePicker(false)}>
            <View style={styles.modal}>
              <Text style={styles.modalTitle}>{t('verification.idType') || 'ID Type'}</Text>
              <FlatList
                data={idTypes}
                keyExtractor={(item) => String(item.CountryIdentificationTypeID)}
                renderItem={({ item }) => (
                  <Pressable
                    style={[styles.option, item.CountryIdentificationTypeName === form.idType && styles.optionActive]}
                    onPress={() => {
                      set('idType')(item.CountryIdentificationTypeName);
                      setShowIdTypePicker(false);
                    }}
                  >
                    <Text style={styles.optionText}>
                      {item.CountryIdentificationTypeEnglishName || item.CountryIdentificationTypeName}
                    </Text>
                  </Pressable>
                )}
              />
            </View>
          </Pressable>
        </Modal>

        {/* Gender Picker */}
        <Modal visible={showGenderPicker} transparent animationType="fade">
          <Pressable style={styles.overlay} onPress={() => setShowGenderPicker(false)}>
            <View style={styles.modal}>
              <Text style={styles.modalTitle}>{t('verification.gender') || 'Gender'}</Text>
              <FlatList
                data={GENDER_OPTIONS}
                keyExtractor={(item) => String(item.id)}
                renderItem={({ item }) => (
                  <Pressable
                    style={[styles.option, item.id === form.genderTypeId && styles.optionActive]}
                    onPress={() => { set('genderTypeId')(item.id); setShowGenderPicker(false); }}
                  >
                    <Text style={styles.optionText}>{item.label}</Text>
                  </Pressable>
                )}
              />
            </View>
          </Pressable>
        </Modal>
      </>
    );
  }

  // ─── Step: Submitting ─────────────────────────────────────────────────────
  if (step === 'submitting') {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.submittingText}>{t('verification.submitting') || 'Submitting your verification...'}</Text>
      </View>
    );
  }

  // ─── Step: Done ───────────────────────────────────────────────────────────
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.doneIcon}>✅</Text>
      <Text style={styles.doneTitle}>{t('verification.step4Title') || 'Verification Submitted'}</Text>
      <Text style={styles.doneDesc}>{t('verification.step4Hint') || 'Your documents have been submitted for review. Share your verification link with the verifier.'}</Text>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{t('verification.yourLink') || 'Your Verification Link'}</Text>

        <Text style={styles.label}>{t('verification.reference') || 'Reference'}</Text>
        <Pressable style={styles.copyRow} onPress={() => Clipboard.setStringAsync(vlinkReference)}>
          <Text style={styles.copyValue}>{vlinkReference}</Text>
          <Text style={styles.copyBtn}>Copy</Text>
        </Pressable>

        <Text style={styles.label}>{t('verification.verifyUrl') || 'Verify URL'}</Text>
        <Pressable style={styles.copyRow} onPress={() => Clipboard.setStringAsync(vlinkUrl)}>
          <Text style={styles.copyValue} numberOfLines={2}>{vlinkUrl}</Text>
          <Text style={styles.copyBtn}>Copy</Text>
        </Pressable>
      </View>

      <Pressable style={styles.submitBtn} onPress={() => router.replace('/(app)/profile' as any)}>
        <Text style={styles.submitBtnText}>{t('verification.viewProfile') || 'View in Profile'}</Text>
      </Pressable>
      <Pressable style={styles.backBtn} onPress={() => router.replace('/(app)/dashboard' as any)}>
        <Text style={styles.backBtnText}>{t('verification.goToDashboard') || 'Go to Dashboard'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },

  title: { fontSize: 28, fontWeight: 'bold', color: colors.textPrimary, textAlign: 'center', marginTop: spacing.lg, marginBottom: spacing.xs },
  stepLabel: { fontSize: typography.caption, color: colors.primary, textAlign: 'center', marginBottom: spacing.xs },
  stepTitle: { fontSize: typography.heading, fontWeight: '600', color: colors.textPrimary, textAlign: 'center', marginBottom: spacing.xs },
  stepDesc: { fontSize: typography.small, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.lg },

  loader: { marginTop: spacing.xxl },
  miniLoader: { marginVertical: spacing.sm },

  errorBox: {
    backgroundColor: `${colors.danger}22`,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: { color: colors.danger, fontSize: typography.small },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },

  uploadBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  uploadBtnAlt: { backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border },
  uploadBtnText: { color: colors.textPrimary, fontSize: typography.body, fontWeight: '600' },

  backBtn: { alignItems: 'center', paddingVertical: spacing.sm, marginTop: spacing.xs },
  backBtnText: { color: colors.textSecondary, fontSize: typography.small },

  sectionTitle: { fontSize: typography.body, fontWeight: '600', color: colors.textPrimary, marginTop: spacing.sm, marginBottom: spacing.xs },

  label: { fontSize: typography.caption, color: colors.textSecondary, marginTop: spacing.xs, marginBottom: 2 },
  input: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.textPrimary,
    fontSize: typography.body,
    marginBottom: spacing.xs,
  },

  pickerBtn: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  pickerValue: { flex: 1, color: colors.textPrimary, fontSize: typography.body },
  chevron: { color: colors.primary },

  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  submitBtnText: { color: colors.textPrimary, fontSize: typography.body, fontWeight: '600' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: spacing.xl },
  modal: { backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden', maxHeight: 400 },
  modalTitle: {
    fontSize: typography.body,
    fontWeight: 'bold',
    color: colors.textPrimary,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  option: { padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  optionActive: { backgroundColor: `${colors.primary}22` },
  optionText: { fontSize: typography.body, color: colors.textPrimary },
  optionSub: { fontSize: typography.caption, color: colors.textMuted, marginTop: 2 },

  centered: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  submittingText: { fontSize: typography.body, color: colors.textSecondary, marginTop: spacing.md },

  doneIcon: { fontSize: 64, textAlign: 'center', marginBottom: spacing.md, marginTop: spacing.xl },
  doneTitle: { fontSize: typography.heading, fontWeight: 'bold', color: colors.textPrimary, marginBottom: spacing.sm, textAlign: 'center' },
  doneDesc: { fontSize: typography.small, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.lg },

  copyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.xs,
  },
  copyValue: { flex: 1, fontSize: typography.caption, color: colors.textPrimary, marginRight: spacing.sm },
  copyBtn: { fontSize: typography.caption, color: colors.primary, fontWeight: '700' },
});
