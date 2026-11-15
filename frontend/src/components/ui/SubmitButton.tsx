interface SubmitButtonProps {
  pending: boolean;
  idle: string;
  waiting: string;
}

export function SubmitButton({ pending, idle, waiting }: SubmitButtonProps) {
  return <button className="primary-button" type="submit" disabled={pending}>{pending ? waiting : idle}</button>;
}
