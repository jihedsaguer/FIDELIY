export interface RegisterCustomerDto {
  name: string;
  phone: string;
  dateOfBirth?: string;
}

export interface RegisterCustomerResponse {
  customerId: string;
  name: string;
  phone: string;
  isNewCustomer: boolean;
  membershipId?: string;
  personalQrCredential?: string;
}
