export type RootStackParamList = {
  index: undefined; // Splash
  '(auth)': undefined;
  '(tabs)': undefined;
};

export type AuthStackParamList = {
  onboarding: undefined;
  login?: undefined;
  register?: undefined;
};

export type TabsParamList = {
  index: undefined; // Home
  transactions: undefined;
  budgets: undefined;
  reports: undefined;
};
