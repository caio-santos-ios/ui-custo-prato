export type TSignature = {
    cnpj: string;
    tradeName: string;
    corporateName: string;
    email: string;
    phone: string;
    password: string;
    address: TAddressSignature;
    setting: TSettingSignature;
}

export type TAddressSignature = {
    zipCode: string;
    street: string;
    number: string;
    complement: string;
    neighborhood: string;
    city: string;
    state: string;
}

export type TSettingSignature = {
    logo: string;
    primaryColor: string;
    secondaryColor: string;
}

export const ResetSignature: TSignature = {
    cnpj: "",
    tradeName: "",
    corporateName: "",
    email: "",
    phone: "",
    password: "",
    address: {
        zipCode: "",
        street: "",
        number: "",
        complement: "",
        neighborhood: "",
        city: "",
        state: ""
    },
    setting: {
        logo: "",
        primaryColor: "",
        secondaryColor: ""
    }
}