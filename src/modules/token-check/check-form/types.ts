export type CheckFormProps = {
  /** The address of the current result, if any (compact layout on phones). */
  checkedAddress: string | null;
  isScanning: boolean;
  onSubmit: (address: string) => void;
  initialValue?: string;
  autoFocus?: boolean;
};
