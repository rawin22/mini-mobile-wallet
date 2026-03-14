export interface NotaryNode {
    branchId: string;
    name: string;
    countryCode: string;
    isDefault: boolean;
}

export interface SignupFormData {
    username: string;
    password: string;
    confirmPassword: string;
    email: string;
    cellphone: string;
    firstName: string;
    lastName: string;
    referredBy: string;
    notaryNodeBranchId: string;
}

export interface SignupFormConfig {
    passwordRegEx?: string;
    passwordRegExMessage?: string;
    isReferredByRequired: boolean;
    notaryNodes: NotaryNode[];
}

export interface SignupResult {
    redirectUrl: string;
    message: string;
}

export interface ApiProblem {
    code?: string;
    message?: string;
}

export interface SignupResponseBase {
    IsSuccessful?: boolean;
    isSuccessful?: boolean;
    HasErrors?: boolean;
    hasErrors?: boolean;
    ErrorMessages?: string[];
    errorMessages?: string[];
    Problems?: ApiProblem[] | null;
    problems?: ApiProblem[] | null;
}

export interface UsernameExistsResponse extends SignupResponseBase {
    Exists?: boolean;
    exists?: boolean;
}

export interface CustomerFromTemplateRequest {
    BranchId: string;
    AccountRepresentativeId: string;
    CustomerTemplateId: string;
    CustomerTypeId: number;
    FirstName: string;
    LastName: string;
    Email: string;
    CellPhone: string;
    CountryCode: string;
    ReferredByPlatform: string;
    ReferredByName: string;
    CustomerName: string;
    MiddleName: string;
    MailingAddressLine1: string;
    MailingAddressLine2: string;
    MailingAddressLine3: string;
    MailingAddressCity: string;
    MailingAddressStateProvince: string;
    MailingAddressCountryCode: string;
    MailingAddressZipCode: string;
}

export interface CustomerFromTemplateResponse extends SignupResponseBase {
    Customer?: {
        CustomerId?: string;
    };
    customer?: {
        customerId?: string;
    };
}

export interface CustomerUserCreateRequest {
    CustomerId: string;
    UserName: string;
    Password: string;
    EmailAddress: string;
    FirstName: string;
    LastName: string;
    IsApproved: boolean;
    UserMustChangePassword: boolean;
    EmailPasswordToUser: boolean;
    WKYCId: string;
}

export interface CustomerUserCreateResponse extends SignupResponseBase {
    User?: {
        UserId?: string;
    };
    user?: {
        userId?: string;
    };
}

export interface AccessRightTemplateLinkRequest {
    UserId: string;
    AccessRightTemplateId: string;
}
