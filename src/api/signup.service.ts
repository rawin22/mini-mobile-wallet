import { apiClient } from './client';
import { authService } from './auth.service';
import { API_CONFIG, getActiveSignupConfig } from './config';
import type {
    AccessRightTemplateLinkRequest,
    CustomerFromTemplateRequest,
    CustomerFromTemplateResponse,
    CustomerUserCreateRequest,
    CustomerUserCreateResponse,
    NotaryNode,
    SignupFormConfig,
    SignupFormData,
    SignupResponseBase,
    SignupResult,
    UsernameExistsResponse,
} from '../types/signup.types';

export type SignupErrorCode =
    | 'missingBankCredentials'
    | 'bankAuthFailed'
    | 'usernameExists'
    | 'customerCreateFailed'
    | 'customerUserCreateFailed'
    | 'accessRightsLinkFailed'
    | 'unknown';

export class SignupError extends Error {
    code: SignupErrorCode;
    responseData?: unknown;

    constructor(code: SignupErrorCode, message?: string, responseData?: unknown) {
        super(message || code);
        this.name = 'SignupError';
        this.code = code;
        this.responseData = responseData;
    }
}

export const extractSignupApiMessage = (source: unknown): string | undefined => {
    if (!source || typeof source !== 'object') return undefined;

    const payload = source as {
        ErrorMessages?: unknown;
        errorMessages?: unknown;
        Problems?: unknown;
        problems?: unknown;
        message?: unknown;
        Message?: unknown;
        detail?: unknown;
        Detail?: unknown;
        title?: unknown;
        Title?: unknown;
    };

    const upperErrors = Array.isArray(payload.ErrorMessages)
        ? payload.ErrorMessages.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
        : [];
    if (upperErrors.length > 0) return upperErrors[0];

    const lowerErrors = Array.isArray(payload.errorMessages)
        ? payload.errorMessages.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
        : [];
    if (lowerErrors.length > 0) return lowerErrors[0];

    const problems = Array.isArray(payload.Problems)
        ? payload.Problems
        : Array.isArray(payload.problems)
            ? payload.problems
            : [];

    for (const problem of problems) {
        if (!problem || typeof problem !== 'object') continue;
        const candidate = problem as {
            message?: unknown;
            Message?: unknown;
            detail?: unknown;
            Detail?: unknown;
            description?: unknown;
            Description?: unknown;
            title?: unknown;
            Title?: unknown;
        };

        const values = [
            candidate.message,
            candidate.Message,
            candidate.detail,
            candidate.Detail,
            candidate.description,
            candidate.Description,
            candidate.title,
            candidate.Title,
        ];

        for (const value of values) {
            if (typeof value === 'string' && value.trim().length > 0) {
                return value;
            }
        }
    }

    const topValues = [
        payload.message,
        payload.Message,
        payload.detail,
        payload.Detail,
        payload.title,
        payload.Title,
    ];

    for (const value of topValues) {
        if (typeof value === 'string' && value.trim().length > 0) {
            return value;
        }
    }

    return undefined;
};

const toPayloadSnippet = (source: unknown, maxLength = 700): string | undefined => {
    if (source === null || source === undefined) return undefined;

    if (typeof source === 'string') {
        const cleaned = source.trim();
        if (!cleaned) return undefined;
        return cleaned.length > maxLength ? `${cleaned.slice(0, maxLength)}...` : cleaned;
    }

    try {
        const serialized = JSON.stringify(source);
        if (!serialized || serialized === '{}' || serialized === '[]') return undefined;
        return serialized.length > maxLength ? `${serialized.slice(0, maxLength)}...` : serialized;
    } catch {
        return undefined;
    }
};

const buildErrorMessage = (fallbackMessage: string, responseData?: unknown): string => {
    const apiMessage = extractSignupApiMessage(responseData);
    if (apiMessage) return apiMessage;

    const payloadSnippet = toPayloadSnippet(responseData);
    if (payloadSnippet) {
        return `${fallbackMessage} API response: ${payloadSnippet}`;
    }

    return fallbackMessage;
};

const getIsSuccessful = (response: SignupResponseBase): boolean => {
    if (typeof response.IsSuccessful === 'boolean') return response.IsSuccessful;
    if (typeof response.isSuccessful === 'boolean') return response.isSuccessful;
    return true;
};

const getErrorMessages = (response: SignupResponseBase): string[] => {
    const allMessages: string[] = [];

    if (Array.isArray(response.ErrorMessages)) {
        allMessages.push(...response.ErrorMessages.filter(Boolean));
    }

    if (Array.isArray(response.errorMessages)) {
        allMessages.push(...response.errorMessages.filter(Boolean));
    }

    const problems = response.Problems ?? response.problems;
    if (Array.isArray(problems)) {
        allMessages.push(
            ...problems
                .map((problem) => {
                    if (!problem || typeof problem !== 'object') return '';

                    const candidate = problem as {
                        message?: unknown;
                        Message?: unknown;
                        messageDetails?: unknown;
                        MessageDetails?: unknown;
                        detail?: unknown;
                        Detail?: unknown;
                        fieldName?: unknown;
                        FieldName?: unknown;
                        fieldValue?: unknown;
                        FieldValue?: unknown;
                    };

                    if (typeof candidate.message === 'string' && candidate.message.trim().length > 0) {
                        return candidate.message;
                    }

                    if (typeof candidate.Message === 'string' && candidate.Message.trim().length > 0) {
                        return candidate.Message;
                    }

                    if (typeof candidate.messageDetails === 'string' && candidate.messageDetails.trim().length > 0) {
                        return candidate.messageDetails;
                    }

                    if (typeof candidate.MessageDetails === 'string' && candidate.MessageDetails.trim().length > 0) {
                        return candidate.MessageDetails;
                    }

                    if (typeof candidate.detail === 'string' && candidate.detail.trim().length > 0) {
                        return candidate.detail;
                    }

                    if (typeof candidate.Detail === 'string' && candidate.Detail.trim().length > 0) {
                        return candidate.Detail;
                    }

                    const fieldName =
                        typeof candidate.fieldName === 'string'
                            ? candidate.fieldName
                            : typeof candidate.FieldName === 'string'
                                ? candidate.FieldName
                                : '';
                    const fieldValue =
                        typeof candidate.fieldValue === 'string'
                            ? candidate.fieldValue
                            : typeof candidate.FieldValue === 'string'
                                ? candidate.FieldValue
                                : '';

                    if (fieldName.trim().length > 0) {
                        return fieldValue.trim().length > 0
                            ? `${fieldName}: ${fieldValue}`
                            : fieldName;
                    }

                    return '';
                })
                .filter(Boolean),
        );
    }

    return allMessages;
};

const assertSuccessful = (
    response: SignupResponseBase,
    fallbackCode: SignupErrorCode,
    fallbackMessage: string,
): void => {
    const messages = getErrorMessages(response);
    if (getIsSuccessful(response) && messages.length === 0) return;

    const message = messages[0] || buildErrorMessage(fallbackMessage, response);
    throw new SignupError(fallbackCode, message, response);
};

const getCustomerId = (response: CustomerFromTemplateResponse): string => {
    const customerId = response.Customer?.CustomerId ?? response.customer?.customerId;
    if (!customerId) {
        throw new SignupError(
            'customerCreateFailed',
            'Customer creation succeeded but customer ID was missing in response.',
        );
    }
    return customerId;
};

const getUserId = (response: CustomerUserCreateResponse): string => {
    const userId = response.User?.UserId ?? response.user?.userId;
    if (!userId) {
        throw new SignupError(
            'customerUserCreateFailed',
            'User creation succeeded but user ID was missing in response.',
        );
    }
    return userId;
};

const resolveNotaryNodes = (): NotaryNode[] => {
    const signupConfig = getActiveSignupConfig();

    if (signupConfig.NOTARY_NODES.length > 0) {
        return signupConfig.NOTARY_NODES;
    }

    return [
        {
            branchId: '',
            name: 'Default Notary Node',
            countryCode: signupConfig.DEFAULT_COUNTRY_CODE,
            isDefault: true,
        },
    ];
};

const getDefaultNotaryNode = (notaryNodes: NotaryNode[]): NotaryNode => {
    return notaryNodes.find((node) => node.isDefault) ?? notaryNodes[0];
};

const authenticateBankUser = async (): Promise<{
    bankToken: string;
    passwordRegEx?: string;
    passwordRegExMessage?: string;
}> => {
    const { BANK_USERNAME, BANK_PASSWORD } = getActiveSignupConfig();

    if (!BANK_USERNAME || !BANK_PASSWORD) {
        throw new SignupError(
            'missingBankCredentials',
            'Bank user credentials are missing. Set VITE_BANK_USERNAME and VITE_BANK_PASSWORD in .env.',
        );
    }

    let authResponse;
    try {
        authResponse = await authService.login(BANK_USERNAME, BANK_PASSWORD);
    } catch (error) {
        throw new SignupError('bankAuthFailed', error instanceof Error ? error.message : 'Bank auth failed');
    }

    const bankToken = authResponse.tokens?.accessToken;
    if (!bankToken) {
        throw new SignupError('bankAuthFailed', 'Bank user authentication failed: missing access token in response.');
    }

    return {
        bankToken,
        passwordRegEx: authResponse.userSettings?.passwordRegEx,
        passwordRegExMessage: authResponse.userSettings?.passwordRegExMessage,
    };
};

const getAuthHeaders = (accessToken: string) => ({
    Authorization: `Bearer ${accessToken}`,
});

const checkUsernameAvailability = async (username: string, bankToken: string): Promise<void> => {
    const response = await apiClient.get<UsernameExistsResponse>(
        `${API_CONFIG.ENDPOINTS.USER.DOES_USERNAME_EXIST}/${encodeURIComponent(username)}`,
        {
            headers: getAuthHeaders(bankToken),
        },
    );

    assertSuccessful(response.data, 'usernameExists', 'Unable to validate username availability.');

    const exists = response.data.Exists ?? response.data.exists ?? false;
    if (exists) {
        throw new SignupError('usernameExists', 'Username already exists. Please choose a different username.');
    }
};

const createCustomer = async (
    payload: CustomerFromTemplateRequest,
    bankToken: string,
): Promise<string> => {
    let response;
    try {
        response = await apiClient.post<CustomerFromTemplateResponse>(
            API_CONFIG.ENDPOINTS.CUSTOMER.FROM_TEMPLATE,
            payload,
            {
                headers: getAuthHeaders(bankToken),
            },
        );
    } catch (error) {
        const responseData =
            error && typeof error === 'object'
                ? (error as { response?: { data?: unknown } }).response?.data
                : undefined;
        throw new SignupError(
            'customerCreateFailed',
            buildErrorMessage('Failed to create customer profile.', responseData),
            responseData,
        );
    }

    assertSuccessful(response.data, 'customerCreateFailed', 'Failed to create customer profile.');
    return getCustomerId(response.data);
};

const createCustomerUser = async (
    payload: CustomerUserCreateRequest,
    bankToken: string,
): Promise<string> => {
    let response;
    try {
        response = await apiClient.post<CustomerUserCreateResponse>(
            API_CONFIG.ENDPOINTS.CUSTOMER.USER,
            payload,
            {
                headers: getAuthHeaders(bankToken),
            },
        );
    } catch (error) {
        const responseData =
            error && typeof error === 'object'
                ? (error as { response?: { data?: unknown } }).response?.data
                : undefined;
        throw new SignupError(
            'customerUserCreateFailed',
            buildErrorMessage('Failed to create customer user.', responseData),
            responseData,
        );
    }

    assertSuccessful(response.data, 'customerUserCreateFailed', 'Failed to create customer user.');
    return getUserId(response.data);
};

const linkAccessRights = async (
    payload: AccessRightTemplateLinkRequest,
    bankToken: string,
): Promise<void> => {
    let response;
    try {
        response = await apiClient.patch<SignupResponseBase>(
            API_CONFIG.ENDPOINTS.USER.LINK_ACCESS_RIGHT_TEMPLATE,
            payload,
            {
                headers: getAuthHeaders(bankToken),
            },
        );
    } catch (error) {
        const responseData =
            error && typeof error === 'object'
                ? (error as { response?: { data?: unknown } }).response?.data
                : undefined;
        throw new SignupError(
            'accessRightsLinkFailed',
            buildErrorMessage('Failed to assign access rights.', responseData),
            responseData,
        );
    }

    assertSuccessful(response.data, 'accessRightsLinkFailed', 'Failed to assign access rights.');
};

export const signupService = {
    async loadSignupFormConfig(): Promise<SignupFormConfig> {
        const signupConfig = getActiveSignupConfig();
        const notaryNodes = resolveNotaryNodes();
        try {
            const authContext = await authenticateBankUser();

            return {
                passwordRegEx: authContext.passwordRegEx,
                passwordRegExMessage: authContext.passwordRegExMessage,
                isReferredByRequired: signupConfig.IS_REFERRED_BY_REQUIRED,
                notaryNodes,
            };
        } catch (error) {
            console.warn('Signup config fallback activated:', error);
            return {
                isReferredByRequired: signupConfig.IS_REFERRED_BY_REQUIRED,
                notaryNodes,
            };
        }
    },

    async register(request: SignupFormData): Promise<SignupResult> {
        const signupConfig = getActiveSignupConfig();
        const notaryNodes = resolveNotaryNodes();
        const defaultNode = getDefaultNotaryNode(notaryNodes);
        const selectedNode =
            notaryNodes.find((node) => node.branchId === request.notaryNodeBranchId) ?? defaultNode;

        const { bankToken } = await authenticateBankUser();

        await checkUsernameAvailability(request.username, bankToken);

        const emailToUse = request.email.trim() || signupConfig.DEFAULT_REGISTERING_EMAIL;

        const customerId = await createCustomer(
            {
                BranchId: selectedNode.branchId,
                AccountRepresentativeId: signupConfig.ACCOUNT_REPRESENTATIVE_ID,
                CustomerTemplateId: signupConfig.CUSTOMER_TEMPLATE_ID,
                CustomerTypeId: 1,
                FirstName: request.firstName.trim(),
                LastName: request.lastName.trim(),
                Email: emailToUse,
                CellPhone: request.cellphone.trim(),
                CountryCode: selectedNode.countryCode || signupConfig.DEFAULT_COUNTRY_CODE,
                ReferredByPlatform: signupConfig.REFERRED_BY_PLATFORM,
                ReferredByName: request.referredBy.trim(),
                CustomerName: '',
                MiddleName: '',
                MailingAddressLine1: '',
                MailingAddressLine2: '',
                MailingAddressLine3: '',
                MailingAddressCity: '',
                MailingAddressStateProvince: '',
                MailingAddressCountryCode: '',
                MailingAddressZipCode: '',
            },
            bankToken,
        );

        const userId = await createCustomerUser(
            {
                CustomerId: customerId,
                UserName: request.username.trim(),
                Password: request.password,
                EmailAddress: emailToUse,
                FirstName: request.firstName.trim(),
                LastName: request.lastName.trim(),
                IsApproved: true,
                UserMustChangePassword: false,
                EmailPasswordToUser: false,
                WKYCId: '',
            },
            bankToken,
        );

        await linkAccessRights(
            {
                UserId: userId,
                AccessRightTemplateId: signupConfig.ACCESS_RIGHT_TEMPLATE_ID,
            },
            bankToken,
        );

        return {
            redirectUrl: signupConfig.AFTER_SIGNUP_URL || '/login',
            message: 'Account successfully created.',
        };
    },
};
