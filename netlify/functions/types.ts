export interface NextData {
  buildId: string;
  [key: string]: unknown;
}

export interface PkmnGgProfileResponse {
  pageProps: {
    username: string;
    friendCount: number;
    userStats: {
      uniqueCardCount: number;
      collectionValue: number;
      category: string
    }[];
  };
}

export interface UserStats {
  category: string;
  uniqueCardCount : number;
  collectionValue: number;
}