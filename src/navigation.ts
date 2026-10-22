import { NativeStackScreenProps } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Members: undefined;
  AddMember: { memberId?: string } | undefined; // memberId present = edit
  MemberDetail: { memberId: string };
  AddMeasurement: { memberId: string };
};

export type ScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  T
>;
