import { apiClient } from './client';
import { authService } from './auth.service';
import { API_CONFIG, getActiveSignupConfig } from './config';
import type {
    CountryIdentificationType,
    CountryIdTypeListResponse,
    CountryInfo,
    CountryListResponse,
    CustomerGetData,
    CustomerGetResponse,
    CustomerUpdateFields,
    CustomerUpdateResponse,
    FileAttachmentAddData,
    FileAttachmentAddRequest,
    FileAttachmentAddResponse,
    FileAttachmentInfoItem,
    FileAttachmentInfoListResponse,
    FileAttachmentUpdateRequest,
    VerificationFormData,
    VerifiedLinkCreateData,
    VerifiedLinkCreateRequest,
    VerifiedLinkCreateResponse,
    VerifiedLinkUpdateRequest,
    VerifiedLinkSearchRecord,
    VerifiedLinkSearchResponse,
    WizardStep,
} from '../types/verification.types';
import type { SignupResponseBase } from '../types/signup.types';
import { extractSignupApiMessage } from './signup.service';

// ── Error handling (reuses patterns from signup.service.ts) ──

export class VerificationError extends Error {
    code: string;
    responseData?: unknown;

    constructor(code: string, message?: string, responseData?: unknown) {
        super(message || code);
        this.name = 'VerificationError';
        this.code = code;
        this.responseData = responseData;
    }
}

const getIsSuccessful = (response: SignupResponseBase): boolean => {
    if (typeof response.IsSuccessful === 'boolean') return response.IsSuccessful;
    if (typeof response.isSuccessful === 'boolean') return response.isSuccessful;
    return true;
};

const buildErrorMessage = (fallback: string, responseData?: unknown): string => {
    const apiMessage = extractSignupApiMessage(responseData);
    if (apiMessage) return apiMessage;
    return fallback;
};

const assertSuccessful = (
    response: SignupResponseBase,
    code: string,
    fallback: string,
): void => {
    if (getIsSuccessful(response)) return;
    throw new VerificationError(code, buildErrorMessage(fallback, response), response);
};

// ── Bank user authentication (same PoC pattern as signup) ──

const authenticateBankUser = async (): Promise<string> => {
    const { BANK_USERNAME, BANK_PASSWORD } = getActiveSignupConfig();
    if (!BANK_USERNAME || !BANK_PASSWORD) {
        throw new VerificationError('missingBankCredentials', 'Bank user credentials not configured.');
    }

    const authResponse = await authService.login(BANK_USERNAME, BANK_PASSWORD);
    const bankToken = authResponse.tokens?.accessToken;
    if (!bankToken) {
        throw new VerificationError('bankAuthFailed', 'Bank user authentication failed.');
    }
    return bankToken;
};

const bankAuthHeaders = async () => ({
    Authorization: `Bearer ${await authenticateBankUser()}`,
});

// ── Helpers ──

export const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result as string;
            // Strip the data URL prefix (e.g. "data:image/jpeg;base64,")
            const base64 = result.includes(',') ? result.split(',')[1] : result;
            resolve(base64);
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
    });
};

export const buildIdDescription = (data: VerificationFormData): string => {
    const parts = [
        `documentType: Proof of Identity`,
        `country_of_issuance: ${data.countryOfIssuance}`,
        `id_type: ${data.idType}`,
        `account/id_number: ${data.idNumber}`,
        `issuer_name: ${data.issuerName}`,
        `issuance_date: ${data.issuanceDate}`,
        `expiry_date: ${data.expirationDate}`,
    ];
    return parts.join(', ');
};

export const appendVerificationMetadata = (
    baseDescription: string,
    userId: string,
    userName: string,
    fullName: string,
    vlinkId: string,
    vlinkReference: string,
): string => {
    const metaParts = [
        `is_get_verified_requested: True`,
        `get_verified_requested_by_user_id: ${userId}`,
        `get_verified_requested_by_user_name: ${userName}`,
        `get_verified_requested_by_name: ${fullName}`,
        `get_verified_requested_date: ${new Date().toISOString().split('T')[0]}`,
        `get_verified_vlink_id: ${vlinkId}`,
        `get_verified_vlink_reference: ${vlinkReference}`,
    ];
    return `${baseDescription}, ${metaParts.join(', ')}`;
};

/** Build the VLink Message field — uses the canonical key names expected by the back-office. */
export const buildVlinkMessage = (
    data: VerificationFormData,
    userId: string,
    userName: string,
    fullName: string,
): string => {
    const parts = [
        `id_country_of_issuance: ${data.countryOfIssuance}`,
        `id_type: ${data.idType}`,
        `id_number: ${data.idNumber}`,
        `id_issuance_date: ${data.issuanceDate}`,
        `id_issuer_authority: ${data.issuerName}`,
        `id_expiration_date: ${data.expirationDate}`,
        `is_get_verified_requested: True`,
        `get_verified_requested_by_user_id: ${userId}`,
        `get_verified_requested_by_user_name: ${userName}`,
        `get_verified_requested_by_name: ${fullName}`,
        `get_verified_requested_date: ${new Date().toISOString().split('T')[0]}`,
    ];
    return parts.join(', ');
};

export const parseDescriptionProperties = (description: string): Record<string, string> => {
    const result: Record<string, string> = {};
    if (!description) return result;
    const pairs = description.split(',').map((s) => s.trim());
    for (const pair of pairs) {
        const colonIdx = pair.indexOf(':');
        if (colonIdx > 0) {
            const key = pair.slice(0, colonIdx).trim();
            const value = pair.slice(colonIdx + 1).trim();
            result[key] = value;
        }
    }
    return result;
};

/** Map OCR properties from API response to form fields */
export const mapOcrToFormData = (
    properties: Record<string, string> | null | undefined,
): Partial<VerificationFormData> => {
    if (!properties) return {};
    const p = properties;
    const result: Partial<VerificationFormData> = {};

    if (p['id_issued_country']) result.countryOfIssuance = p['id_issued_country'];
    if (p['id_type']) result.idType = p['id_type'];
    if (p['id_number']) result.idNumber = p['id_number'];
    if (p['id_issued_authority']) result.issuerName = p['id_issued_authority'];
    if (p['id_issued_date']) result.issuanceDate = p['id_issued_date'];
    if (p['id_expiration_date']) result.expirationDate = p['id_expiration_date'];
    if (p['id_birth_date']) result.dateOfBirth = p['id_birth_date'];
    if (p['id_nationality']) result.nationality = p['id_nationality'];
    if (p['id_birth_place']) result.placeOfBirth = p['id_birth_place'];

    if (p['id_sex']) {
        const sex = p['id_sex'].toUpperCase();
        if (sex === 'M' || sex === 'MALE') result.genderTypeId = 1;
        else if (sex === 'F' || sex === 'FEMALE') result.genderTypeId = 2;
    }

    return result;
};

/** Merge front and back OCR properties (front takes priority) */
export const mergeOcrProperties = (
    frontProps: Record<string, string> | null | undefined,
    backProps: Record<string, string> | null | undefined,
): Record<string, string> => {
    const merged: Record<string, string> = {};
    if (backProps) Object.assign(merged, backProps);
    if (frontProps) Object.assign(merged, frontProps);
    return merged;
};

/** Determine current wizard step from existing file attachments */
export const detectWizardStep = (attachments: FileAttachmentInfoItem[]): WizardStep => {
    const hasFront = attachments.some((a) => {
        const typeId = a.FileAttachmentTypeId ?? a.fileAttachmentTypeId;
        return typeId === 1; // ProofOfIdentityFront
    });

    if (!hasFront) return 1;

    const hasSelfie = attachments.some((a) => {
        const typeId = a.FileAttachmentTypeId ?? a.fileAttachmentTypeId;
        return typeId === 3; // SelfiePhoto
    });

    if (!hasSelfie) return 2;

    // Check if verification has been submitted (VLink metadata in front file description)
    const frontFile = attachments.find((a) => {
        const typeId = a.FileAttachmentTypeId ?? a.fileAttachmentTypeId;
        return typeId === 1;
    });

    const desc = frontFile?.Description ?? frontFile?.description ?? '';
    if (desc.includes('get_verified_vlink_id:')) return 4;

    return 3;
};

const normalizeIdType = (item: CountryIdentificationType): CountryIdentificationType => ({
    CountryIdentificationTypeID: item.CountryIdentificationTypeID ?? item.countryIdentificationTypeID ?? 0,
    CountryIdentificationTypeName: item.CountryIdentificationTypeName ?? item.countryIdentificationTypeName ?? '',
    CountryIdentificationTypeEnglishName: item.CountryIdentificationTypeEnglishName ?? item.countryIdentificationTypeEnglishName ?? '',
    IdentificationTypeID: item.IdentificationTypeID ?? item.identificationTypeID ?? 0,
    IdentificationTypeName: item.IdentificationTypeName ?? item.identificationTypeName ?? '',
    CountryCode: item.CountryCode ?? item.countryCode ?? '',
    StateOrProvince: item.StateOrProvince ?? item.stateOrProvince ?? '',
    Description: item.Description ?? item.description ?? '',
    HasFullSpread: item.HasFullSpread ?? item.hasFullSpread ?? false,
    HasBioDataPage: item.HasBioDataPage ?? item.hasBioDataPage ?? false,
    RequireFrontSide: item.RequireFrontSide ?? item.requireFrontSide ?? true,
    RequireBackSide: item.RequireBackSide ?? item.requireBackSide ?? false,
    Notes: item.Notes ?? item.notes ?? '',
    SortOrder: item.SortOrder ?? item.sortOrder ?? 0,
});

const normalizeFileAttachment = (item: FileAttachmentInfoItem): FileAttachmentInfoItem => ({
    FileAttachmentId: item.FileAttachmentId ?? item.fileAttachmentId ?? '',
    FileAttachmentTypeId: item.FileAttachmentTypeId ?? item.fileAttachmentTypeId ?? 0,
    FileName: item.FileName ?? item.fileName ?? '',
    Description: item.Description ?? item.description ?? '',
    Properties: item.Properties ?? item.properties ?? null,
    IsPrimary: item.IsPrimary ?? true,
    FileAttachmentTypeName: item.FileAttachmentTypeName,
});

// ── Service methods ──

export const verificationService = {
    async getCustomer(customerId: string): Promise<CustomerGetData> {
        const response = await apiClient.get<CustomerGetResponse>(
            `${API_CONFIG.ENDPOINTS.CUSTOMER.GET}/${customerId}`,
        );
        assertSuccessful(response.data, 'customerGetFailed', 'Failed to load customer data.');
        const customer = response.data.Customer ?? response.data.customer;
        if (!customer) {
            throw new VerificationError('customerGetFailed', 'Customer data missing from response.');
        }
        return customer;
    },

    async getCountryList(): Promise<CountryInfo[]> {
        const response = await apiClient.get<CountryListResponse>(
            API_CONFIG.ENDPOINTS.COUNTRY.LIST,
        );
        assertSuccessful(response.data, 'countryListFailed', 'Failed to load country list.');
        return response.data.Countries ?? response.data.countries ?? [];
    },

    async getIdTypes(countryCode: string): Promise<CountryIdentificationType[]> {
        const response = await apiClient.get<CountryIdTypeListResponse>(
            `${API_CONFIG.ENDPOINTS.COUNTRY.ID_TYPES}/${encodeURIComponent(countryCode)}`,
        );
        assertSuccessful(response.data, 'idTypesFailed', 'Failed to load identification types.');
        const items = response.data.IdentificationTypes ?? response.data.identificationTypes ?? [];
        return items.map(normalizeIdType);
    },

    async getFileAttachmentInfoList(customerId: string): Promise<FileAttachmentInfoItem[]> {
        const response = await apiClient.get<FileAttachmentInfoListResponse>(
            `${API_CONFIG.ENDPOINTS.FILE_ATTACHMENT.INFO_LIST}/${customerId}`,
        );
        assertSuccessful(response.data, 'attachmentListFailed', 'Failed to load file attachments.');
        const items = response.data.FileAttachments ?? response.data.fileAttachments ?? [];
        return items.map(normalizeFileAttachment);
    },

    async uploadFile(request: FileAttachmentAddRequest): Promise<FileAttachmentAddData> {
        const response = await apiClient.post<FileAttachmentAddResponse>(
            API_CONFIG.ENDPOINTS.FILE_ATTACHMENT.BASE,
            request,
        );
        assertSuccessful(response.data, 'uploadFailed', 'File upload failed.');

        // Normalize casing from API response
        const d = response.data as Record<string, unknown>;
        const fa = (d.FileAttachment ?? d.fileAttachment) as Record<string, unknown> | undefined;
        const id = (fa?.FileAttachmentId ?? fa?.fileAttachmentId) as string | undefined;
        if (!id) {
            throw new VerificationError('uploadFailed', 'File uploaded but ID missing from response.');
        }

        return {
            FileAttachmentId: id,
            Properties: (fa?.Properties ?? fa?.properties) as Record<string, string> | null ?? null,
        };
    },

    async updateFileAttachment(request: FileAttachmentUpdateRequest): Promise<void> {
        const response = await apiClient.patch<SignupResponseBase>(
            API_CONFIG.ENDPOINTS.FILE_ATTACHMENT.BASE,
            request,
        );
        assertSuccessful(response.data, 'updateAttachmentFailed', 'Failed to update file attachment.');
    },

    async deleteFileAttachment(fileAttachmentId: string): Promise<void> {
        const response = await apiClient.delete<SignupResponseBase>(
            `${API_CONFIG.ENDPOINTS.FILE_ATTACHMENT.BASE}/${fileAttachmentId}`,
        );
        assertSuccessful(response.data, 'deleteAttachmentFailed', 'Failed to delete file attachment.');
    },

    async updateCustomer(fields: CustomerUpdateFields): Promise<void> {
        const headers = await bankAuthHeaders();

        // The API requires ALL fields in the DTO. Fetch current customer first, then merge our changes.
        const getResponse = await apiClient.get<Record<string, unknown>>(
            `${API_CONFIG.ENDPOINTS.CUSTOMER.GET}/${fields.CustomerId}`,
            { headers },
        );
        const customerRaw = (getResponse.data as Record<string, unknown>).Customer
            ?? (getResponse.data as Record<string, unknown>).customer
            ?? {};
        const fullPayload: Record<string, unknown> = { ...(customerRaw as Record<string, unknown>), ...fields };

        // Remove read-only / response-only fields not in the CustomerUpdateRequest DTO
        const removeFields = [
            'Timestamp', 'timestamp',
            'CreatedTime', 'createdTime',
            'CustomerTypeName', 'customerTypeName',
            'BranchName', 'branchName',
            'BranchCountryCode', 'branchCountryCode',
            'BankId', 'bankId',
            'AccountRepresentativeName', 'accountRepresentativeName',
            'GenderTypeName', 'genderTypeName',
            'IdentificationTypeName', 'identificationTypeName',
            'IdentificationIssuedDate', 'identificationIssuedDate',
            'OccupationTypeName', 'occupationTypeName',
            'BusinessStructureTypeName', 'businessStructureTypeName',
            'AttachedIds', 'attachedIds',
            'TrustScore', 'trustScore',
            'SwiftAddressLine1', 'swiftAddressLine1',
            'SwiftAddressLine2', 'swiftAddressLine2',
            'SwiftAddressLine3', 'swiftAddressLine3',
            'WebsiteURL', 'websiteURL', // GET returns websiteURL, DTO expects WebsiteUrl
            'CustomerFirstName', 'customerFirstName',
            'CustomerMiddleName', 'customerMiddleName',
            'CustomerLastName', 'customerLastName',
            'GlobalCustomerFirstName', 'globalCustomerFirstName',
            'GlobalCustomerMiddleName', 'globalCustomerMiddleName',
            'GlobalCustomerLastName', 'globalCustomerLastName',
        ];
        for (const key of removeFields) {
            delete fullPayload[key];
        }

        // Fix Guid fields — the GET response may return empty strings for Guids,
        // but the PATCH DTO requires valid Guid format. Replace empty/invalid with zero Guid.
        const ZERO_GUID = '00000000-0000-0000-0000-000000000000';
        const GUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        // Nullable Guid? fields — keep null if null, fix invalid strings
        const nullableGuidFields = new Set([
            'WhiteLabelProfileId', 'whiteLabelProfileId',
        ]);
        // Required Guid fields — must have a valid value
        const requiredGuidFields = [
            'BranchId', 'branchId',
            'AccountRepresentativeId', 'accountRepresentativeId',
            'FXDealTypeTemplateId', 'fxDealTypeTemplateId',
            'SettlementTypeTemplateId', 'settlementTypeTemplateId',
            'FeeTemplateId', 'feeTemplateId',
            'CurrencyPairAccessTemplateId', 'currencyPairAccessTemplateId',
            'CashSpreadTemplateId', 'cashSpreadTemplateId',
            'TomsSpreadTemplateId', 'tomsSpreadTemplateId',
            'SpotSpreadTemplateId', 'spotSpreadTemplateId',
            'ForwardOutrightSpreadTemplateId', 'forwardOutrightSpreadTemplateId',
            'ForwardWindowSpreadTemplateId', 'forwardWindowSpreadTemplateId',
            'CashCoverRateSpreadTemplateId', 'cashCoverRateSpreadTemplateId',
            'TomsCoverRateSpreadTemplateId', 'tomsCoverRateSpreadTemplateId',
            'SpotCoverRateSpreadTemplateId', 'spotCoverRateSpreadTemplateId',
            'ForwardOutrightCoverRateSpreadTemplateId', 'forwardOutrightCoverRateSpreadTemplateId',
            'ForwardWindowCoverRateSpreadTemplateId', 'forwardWindowCoverRateSpreadTemplateId',
            'IncomingPaymentSpreadTemplateId', 'incomingPaymentSpreadTemplateId',
            'IncomingPaymentCoverRateSpreadTemplateId', 'incomingPaymentCoverRateSpreadTemplateId',
            'ReferrerId', 'referrerId',
            'CustomerId', 'customerId',
        ];
        for (const key of requiredGuidFields) {
            if (key in fullPayload) {
                const val = fullPayload[key];
                if (typeof val === 'string' && !GUID_RE.test(val)) {
                    fullPayload[key] = ZERO_GUID;
                }
                if (val === null || val === undefined) {
                    fullPayload[key] = ZERO_GUID;
                }
            }
        }
        for (const key of nullableGuidFields) {
            if (key in fullPayload) {
                const val = fullPayload[key];
                if (val === undefined) {
                    fullPayload[key] = null; // keep null for nullable Guids
                } else if (typeof val === 'string' && !GUID_RE.test(val)) {
                    fullPayload[key] = null; // invalid string → null
                }
            }
        }

        // Fix field name mismatches between GET response and PATCH DTO
        // GET returns "websiteURL", DTO expects "WebsiteUrl"
        if (!('WebsiteUrl' in fullPayload) && !('websiteUrl' in fullPayload)) {
            fullPayload['WebsiteUrl'] = fullPayload['WebsiteURL'] ?? fullPayload['websiteURL'] ?? '';
        }

        // Ensure Global name fields are set (API requires PascalCase versions)
        fullPayload['GlobalFirstName'] = fullPayload['GlobalFirstName'] ?? fullPayload['globalFirstName'] ?? fields.FirstName ?? '';
        fullPayload['GlobalMiddleName'] = fullPayload['GlobalMiddleName'] ?? fullPayload['globalMiddleName'] ?? fields.MiddleName ?? '';
        fullPayload['GlobalLastName'] = fullPayload['GlobalLastName'] ?? fullPayload['globalLastName'] ?? fields.LastName ?? '';
        fullPayload['GlobalCustomerName'] = fullPayload['GlobalCustomerName'] ?? fullPayload['globalCustomerName']
            ?? `${fields.FirstName} ${fields.LastName}`.trim();
        fullPayload['CustomerName'] = fullPayload['CustomerName'] ?? fullPayload['customerName']
            ?? `${fields.FirstName} ${fields.LastName}`.trim();

        // Fix type mismatches from the GET response before sending to PATCH.
        // The C# DTO has strict types — booleans must be bool, nullable bools can be null, etc.
        const nullableBoolFields = new Set(['IsUSPerson', 'isUSPerson']);
        const boolFields = new Set([
            'IsEnabled', 'isEnabled', 'IsApproved', 'isApproved', 'IsBank', 'isBank',
            'IsBusinessAccount', 'isBusinessAccount', 'IsAutoCoverEnabled', 'isAutoCoverEnabled',
            'IsDualControlEnabled', 'isDualControlEnabled', 'IsPaymentEnabled', 'isPaymentEnabled',
            'IsFXTradingEnabled', 'isFXTradingEnabled', 'IsCurrencyCalculatorEnabled', 'isCurrencyCalculatorEnabled',
            'IsCashIn', 'isCashIn', 'IsCashOut', 'isCashOut', 'IsWKYCVerifier', 'isWKYCVerifier',
            'AllowThirdPartyPayments', 'allowThirdPartyPayments', 'IsCharity', 'isCharity',
            'IgnoreWarningsOnCreate', 'ignoreWarningsOnCreate',
        ]);
        for (const [key, val] of Object.entries(fullPayload)) {
            if (nullableBoolFields.has(key)) {
                // Nullable bool: keep null, convert strings to bool or null
                if (val === '' || val === undefined) {
                    fullPayload[key] = null;
                } else if (typeof val === 'string') {
                    fullPayload[key] = val.toLowerCase() === 'true';
                }
            } else if (boolFields.has(key)) {
                // Non-nullable bool: default to false
                if (val === '' || val === null || val === undefined) {
                    fullPayload[key] = false;
                } else if (typeof val === 'string') {
                    fullPayload[key] = val.toLowerCase() === 'true';
                }
            } else if ((val === null || val === undefined) && !nullableGuidFields.has(key)) {
                // Default: strings get empty, keep the rest (but preserve nullable Guids as null)
                fullPayload[key] = '';
            }
        }

        console.log('[updateCustomer] Merged payload keys:', Object.keys(fullPayload).length);
        console.log('[updateCustomer] Our fields:', JSON.stringify(fields, null, 2));

        const response = await apiClient.patch<CustomerUpdateResponse>(
            API_CONFIG.ENDPOINTS.CUSTOMER.UPDATE,
            fullPayload,
            { headers },
        );
        assertSuccessful(response.data, 'customerUpdateFailed', 'Failed to update customer data.');
    },

    async createVerifiedLink(request: VerifiedLinkCreateRequest): Promise<VerifiedLinkCreateData> {
        const response = await apiClient.post<VerifiedLinkCreateResponse>(
            API_CONFIG.ENDPOINTS.VERIFIED_LINK.BASE,
            request,
        );
        assertSuccessful(response.data, 'vlinkCreateFailed', 'Failed to create verification request.');

        // Normalize casing from API response
        const d = response.data as Record<string, unknown>;
        const vl = (d.VerifiedLink ?? d.verifiedLink) as Record<string, unknown> | undefined;
        const vlinkId = (vl?.VerifiedLinkId ?? vl?.verifiedLinkId) as string | undefined;
        const vlinkRef = (vl?.VerifiedLinkReference ?? vl?.verifiedLinkReference) as string | undefined;

        if (!vlinkId) {
            throw new VerificationError('vlinkCreateFailed', 'VLink created but ID missing from response.');
        }

        return {
            VerifiedLinkId: vlinkId,
            VerifiedLinkReference: vlinkRef ?? '',
            Timestamp: (vl?.Timestamp ?? vl?.timestamp) as string ?? '',
        };
    },

    async updateVerifiedLink(request: VerifiedLinkUpdateRequest): Promise<void> {
        const response = await apiClient.patch<SignupResponseBase>(
            API_CONFIG.ENDPOINTS.VERIFIED_LINK.BASE,
            request,
        );
        assertSuccessful(response.data, 'vlinkUpdateFailed', 'Failed to update verification link.');
    },

    async searchVerifiedLinks(): Promise<VerifiedLinkSearchRecord[]> {
        const response = await apiClient.get<VerifiedLinkSearchResponse>(
            API_CONFIG.ENDPOINTS.VERIFIED_LINK.SEARCH,
            {
                params: {
                    PageIndex: 0,
                    PageSize: 25,
                    VerifiedLinkTypeId: 4,
                    SortBy: 'CreatedTime',
                    SortDirection: 'Descending',
                },
            },
        );
        const d = response.data as Record<string, unknown>;
        const records = (d.Records ?? d.records) as Record<string, unknown> | undefined;
        const vlinks = (records?.VerifiedLinks ?? records?.verifiedLinks) as VerifiedLinkSearchRecord[] | undefined;
        return (vlinks ?? []).filter((vl) => !(vl.isDeleted ?? vl.IsDeleted));
    },

    async getVerifiedLink(verifiedLinkId: string): Promise<Record<string, unknown> | null> {
        try {
            const response = await apiClient.get<Record<string, unknown>>(
                `${API_CONFIG.ENDPOINTS.VERIFIED_LINK.BASE}/${verifiedLinkId}`,
            );
            const d = response.data;
            return (d.VerifiedLink ?? d.verifiedLink) as Record<string, unknown> | null;
        } catch {
            return null;
        }
    },
};
