import type { SignupResponseBase } from './signup.types.ts';

// ── FileAttachment enums ──

export const FileAttachmentTypeId = {
    None: 0,
    ProofOfIdentityFront: 1,
    ProofOfIdentityBack: 2,
    SelfiePhoto: 3,
} as const;

// ── Country ──

export interface CountryInfo {
    CountryCode: string;
    CountryName: string;
    IsIbanCountry: boolean;
    countryCode?: string;
    countryName?: string;
    isIbanCountry?: boolean;
}

export interface CountryListResponse extends SignupResponseBase {
    Countries?: CountryInfo[];
    countries?: CountryInfo[];
}

export interface CountryIdentificationType {
    CountryIdentificationTypeID: number;
    CountryIdentificationTypeName: string;
    CountryIdentificationTypeEnglishName: string;
    IdentificationTypeID: number;
    IdentificationTypeName: string;
    CountryCode: string;
    StateOrProvince: string;
    Description: string;
    HasFullSpread: boolean;
    HasBioDataPage: boolean;
    RequireFrontSide: boolean;
    RequireBackSide: boolean;
    Notes: string;
    SortOrder: number;
    // camelCase alternatives from API
    countryIdentificationTypeID?: number;
    countryIdentificationTypeName?: string;
    countryIdentificationTypeEnglishName?: string;
    identificationTypeID?: number;
    identificationTypeName?: string;
    countryCode?: string;
    stateOrProvince?: string;
    description?: string;
    hasFullSpread?: boolean;
    hasBioDataPage?: boolean;
    requireFrontSide?: boolean;
    requireBackSide?: boolean;
    notes?: string;
    sortOrder?: number;
}

export interface CountryIdTypeListResponse extends SignupResponseBase {
    IdentificationTypes?: CountryIdentificationType[];
    identificationTypes?: CountryIdentificationType[];
}

// ── Customer ──

export interface CustomerGetData {
    CustomerId: string;
    CustomerFirstName: string;
    CustomerMiddleName: string;
    CustomerLastName: string;
    CustomerName: string;
    WKYCId: string;
    WKYCLevel: number;
    CountryCode: string;
    Nationality: string;
    GenderTypeId: number;
    GenderTypeName: string;
    DateOfBirth: string;
    CityOfBirth: string;
    CountryOfBirthCode: string;
    IdentificationTypeId: number;
    IdentificationTypeName: string;
    IdentificationNumber: string;
    IdentificationIssuer: string;
    IdentificationCountryCode: string;
    IdentificationIssuedDate: string;
    IdentificationExpirationDate: string;
    Email: string;
    CellPhone: string;
    FirstName?: string;
    MiddleName?: string;
    LastName?: string;
}

export interface CustomerGetResponse extends SignupResponseBase {
    Customer?: CustomerGetData;
    customer?: CustomerGetData;
}

/** Fields we want to update on the customer — merged with full customer GET before PATCH */
export interface CustomerUpdateFields {
    CustomerId: string;
    FirstName: string;
    MiddleName: string;
    LastName: string;
    Nationality: string;
    GenderTypeId: number;
    DateOfBirth: string | null;
    CityOfBirth: string;
    CountryOfBirthCode: string;
    CountryCode: string;
    IdentificationTypeId: number;
    IdentificationNumber: string;
    IdentificationIssuer: string;
    IdentificationCountryCode: string;
    IdentificationExpirationDate: string | null;
}

export interface CustomerUpdateResponse extends SignupResponseBase {
    Customer?: { CustomerId: string; Timestamp: string };
    customer?: { customerId: string; timestamp: string };
}

// ── FileAttachment ──

export interface FileAttachmentAddRequest {
    ParentObjectId: string;
    ParentObjectTypeId: number;
    SourceIP: string;
    FileAttachmentTypeId: number;
    FileAttachmentSubTypeId: number;
    SumSubTypeId: number;
    FileName: string;
    GroupName: string;
    Properties: Record<string, string> | null;
    IsPrimary: boolean;
    ContainsFront: boolean;
    ContainsBack: boolean;
    ViewableByBanker: boolean;
    ViewableByCustomer: boolean;
    DeletableByCustomer: boolean;
    Description: string;
    BypassFileAnalysis: boolean;
    FileData: string;
}

export interface FileAttachmentAddData {
    FileAttachmentId: string;
    Properties: Record<string, string> | null;
}

export interface FileAttachmentAddResponse extends SignupResponseBase {
    FileAttachment?: FileAttachmentAddData;
    fileAttachment?: {
        fileAttachmentId?: string;
        properties?: Record<string, string> | null;
    };
}

export interface FileAttachmentUpdateRequest {
    FileAttachmentId: string;
    GroupName: string;
    FileAttachmentTypeId: number;
    ViewableByBanker: boolean;
    ViewableByCustomer: boolean;
    DeletableByCustomer: boolean;
    Description: string;
}

export interface FileAttachmentInfoItem {
    FileAttachmentId: string;
    FileAttachmentTypeId: number;
    FileAttachmentTypeName?: string;
    FileName: string;
    Description: string;
    Properties?: Record<string, string> | null;
    IsPrimary: boolean;
    fileAttachmentId?: string;
    fileAttachmentTypeId?: number;
    fileName?: string;
    description?: string;
    properties?: Record<string, string> | null;
}

export interface FileAttachmentInfoListResponse extends SignupResponseBase {
    FileAttachments?: FileAttachmentInfoItem[];
    fileAttachments?: FileAttachmentInfoItem[];
}

// ── VerifiedLink ──

export interface VerifiedLinkCreateRequest {
    VerifiedLinkTypeId: number;
    VerifiedLinkName: string;
    CustomerId: string;
    GroupName: string;
    MinimumWKYCLevel: number;
    Message: string;
    PublicMessage: string;
    BlockchainMessage: string;
    SharedWithName: string;
    WebsiteUrl: string;
    VerifiedLinkUrl: string;
    VerifiedLinkShortUrl: string;
    SelectedAccountAlias: string;
    ShareAccountAlias: boolean;
    ShareBirthCity: boolean;
    ShareBirthCountry: boolean;
    ShareBirthDate: boolean;
    ShareFirstName: boolean;
    ShareMiddleName: boolean;
    ShareLastName: boolean;
    ShareGender: boolean;
    ShareNationality: boolean;
    ShareIdExpirationDate: boolean;
    ShareIdNumber: boolean;
    ShareIdType: boolean;
    ShareIdFront: boolean;
    ShareIdBack: boolean;
    ShareSelfie: boolean;
    IsPrimary: boolean;
}

export interface VerifiedLinkCreateData {
    VerifiedLinkId: string;
    VerifiedLinkReference: string;
    Timestamp: string;
}

export interface VerifiedLinkCreateResponse extends SignupResponseBase {
    VerifiedLink?: VerifiedLinkCreateData;
    verifiedLink?: {
        verifiedLinkId?: string;
        verifiedLinkReference?: string;
        timestamp?: string;
    };
}

export interface VerifiedLinkUpdateRequest {
    VerifiedLinkId: string;
    VerifiedLinkTypeId: number;
    VerifiedLinkName: string;
    GroupName: string;
    MinimumWKYCLevel: number;
    Message: string;
    PublicMessage: string;
    BlockchainMessage: string;
    SharedWithName: string;
    WebsiteUrl: string;
    VerifiedLinkUrl: string;
    VerifiedLinkShortUrl: string;
    SelectedAccountAlias: string;
    AgeConfirmOver: number;
    AgeConfirmUnder: number;
    ShareAccountAlias: boolean;
    ShareBirthCity: boolean;
    ShareBirthCountry: boolean;
    ShareBirthDate: boolean;
    ShareFirstName: boolean;
    ShareMiddleName: boolean;
    ShareLastName: boolean;
    ShareGlobalFirstName: boolean;
    ShareGlobalMiddleName: boolean;
    ShareGlobalLastName: boolean;
    ShareGender: boolean;
    ShareNationality: boolean;
    ShareSuffix: boolean;
    ShareIdExpirationDate: boolean;
    ShareIdNumber: boolean;
    ShareIdType: boolean;
    ShareIdFront: boolean;
    ShareIdBack: boolean;
    ShareSelfie: boolean;
    ShareAgeConfirmOver: boolean;
    ShareAgeConfirmUnder: boolean;
    AdditionalData: string;
    IsWalletLocked: boolean;
    WalletAddress: string;
    TokenId: string;
    NFTReference: string;
    NFTChain: string;
    IsPrimary: boolean;
}

// ── VerifiedLink Search ──

export interface VerifiedLinkSearchRecord {
    VerifiedLinkId: string;
    VerifiedLinkReference: string;
    VerifiedLinkName: string;
    VerifiedLinkTypeId: number;
    VerifiedLinkTypeName: string;
    VerifiedLinkStatusTypeId: number;
    VerifiedLinkStatusTypeName: string;
    CustomerId: string;
    CustomerName: string;
    MinimumWKYCLevel: number;
    IsPrimary: boolean;
    CreatedTime: string;
    // camelCase alternatives from API
    verifiedLinkId?: string;
    verifiedLinkReference?: string;
    verifiedLinkName?: string;
    verifiedLinkStatusTypeId?: number;
    verifiedLinkStatusTypeName?: string;
    [key: string]: unknown;
}

export interface VerifiedLinkSearchResponse extends SignupResponseBase {
    Records?: { VerifiedLinks?: VerifiedLinkSearchRecord[] };
    records?: { verifiedLinks?: VerifiedLinkSearchRecord[] };
}

// ── Wizard local state ──

export interface VerificationFormData {
    countryOfIssuance: string;
    idType: string;
    idNumber: string;
    firstName: string;
    middleName: string;
    lastName: string;
    nationality: string;
    dateOfBirth: string;
    placeOfBirth: string;
    genderTypeId: number;
    issuerName: string;
    issuanceDate: string;
    expirationDate: string;
}

export type WizardStep = 1 | 2 | 3 | 4;
