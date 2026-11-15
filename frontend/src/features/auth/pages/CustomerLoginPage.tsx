import { FormEvent, useState } from "react";
import { PublicLayout } from "../../../components/layout/PublicLayout";
import { FormFeedback } from "../../../components/ui/FormFeedback";
import { SubmitButton } from "../../../components/ui/SubmitButton";
import { paths } from "../../../app/routes/paths";
import { usePhoneSignInMutation } from "../api/authApi";
import { useAuth } from "../AuthProvider";

export default function CustomerLoginPage() {
  const { refreshSession } = useAuth();
  const [phoneSignIn, state] = usePhoneSignInMutation();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    const normalizedPhone = phoneNumber.replace(/[\s()-]/g, "");
    if (!normalizedPhone) {
      setError("Please enter your phone number.");
      return;
    }

    try {
      await phoneSignIn(phoneNumber.trim()).unwrap();
      const currentSession = await refreshSession();
      if (!currentSession) {
        throw new Error("Sign-in succeeded but no session was established. Please try again.");
      }
      window.location.assign(paths.customerDashboard);
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (err.message.includes("429")) {
          setError("Too many sign-in attempts. Please try again in 10 minutes.");
        } else if (err.message.includes("Invalid")) {
          setError("Invalid phone number. Use 8-digit format.");
        } else {
          setError(err.message || "Sign-in failed. Please try again.");
        }
      } else {
        setError("Sign-in failed. Please check your connection and try again.");
      }
    }
  }

  const pending = state.isLoading;

  return (
    <PublicLayout>
      <section className="panel auth-panel">
        <a className="back-link" href="/">← Back</a>
        <p className="eyebrow">Customer account</p>
        <h1>Welcome back</h1>
        <p className="panel-copy">Enter your phone number to access your rewards. No verification code needed.</p>

        <form onSubmit={submit} className="form-stack">
          <label htmlFor="customer-phone">Your phone number</label>
          <input
            id="customer-phone"
            autoComplete="tel"
            type="tel"
            value={phoneNumber}
            onChange={(event) => setPhoneNumber(event.target.value)}
            placeholder="12345678"
            required
            disabled={pending}
            autoFocus
          />
          <p className="field-hint">Use 8-digit format. +216, 0, or 216 prefix will be removed.</p>
          <SubmitButton pending={pending} idle="Access my rewards" waiting="Accessing…" />
        </form>

        <FormFeedback error={error} notice={notice} />
        <p className="fine-print">
          Your phone number is your secure account identifier. We use it to verify your identity and protect your rewards.
        </p>
      </section>
    </PublicLayout>
  );
}
