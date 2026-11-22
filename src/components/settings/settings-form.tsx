"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import Input from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/lib/auth-client";
import { changePasswordSchema, updateNameSchema } from "@/lib/schemas/auth";

interface SettingsFormProps {
  user: {
    name: string;
    email: string;
    emailVerified: boolean;
  };
}

export function SettingsForm({ user }: SettingsFormProps) {
  const router = useRouter();
  const [profileName, setProfileName] = useState(user.name);
  const [nameInput, setNameInput] = useState(user.name);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameError, setNameError] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  // Email verification for accounts created before OTP sign-up existed.
  const [isEmailVerified, setIsEmailVerified] = useState(user.emailVerified);
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [verifyError, setVerifyError] = useState("");
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  async function postEmailOtp(path: string, body?: Record<string, string>) {
    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    });
    const data: { message?: string } = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message ?? "Something went wrong. Please try again.");
    }
  }

  async function handleSendVerificationCode() {
    setVerifyError("");
    setIsSendingCode(true);
    try {
      await postEmailOtp("/api/auth/send-my-email-otp");
      setIsCodeSent(true);
      setResendIn(60);
      toast.success("Verification code sent. Check your email.");
    } catch (err) {
      setVerifyError(err instanceof Error ? err.message : "Could not send the code.");
    } finally {
      setIsSendingCode(false);
    }
  }

  async function handleVerifyEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!/^\d{6}$/.test(otp.trim())) {
      setVerifyError("Enter the 6-digit code.");
      return;
    }
    setVerifyError("");
    setIsVerifying(true);
    try {
      await postEmailOtp("/api/auth/verify-my-email", { otp: otp.trim() });
      setIsEmailVerified(true);
      setIsCodeSent(false);
      setOtp("");
      toast.success("Your email is verified.");
      router.refresh();
    } catch (err) {
      setVerifyError(err instanceof Error ? err.message : "Could not verify the code.");
    } finally {
      setIsVerifying(false);
    }
  }

  async function handleNameSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNameError("");

    const validation = updateNameSchema.safeParse({ name: nameInput });
    if (!validation.success) {
      setNameError(
        validation.error.issues[0]?.message ?? "Enter a valid name.",
      );
      return;
    }

    setIsSavingName(true);
    try {
      const result = await authClient.updateUser({
        name: validation.data.name,
      });

      if (result.error) {
        setNameError(result.error.message ?? "Could not update your name.");
        return;
      }

      setProfileName(validation.data.name);
      setNameInput(validation.data.name);
      setIsEditingName(false);
      toast.success("Your name was updated.");
      router.refresh();
    } catch {
      setNameError("Could not update your name. Please try again.");
    } finally {
      setIsSavingName(false);
    }
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError("");

    const validation = changePasswordSchema.safeParse({
      currentPassword,
      newPassword,
      confirmPassword,
    });
    if (!validation.success) {
      setPasswordError(
        validation.error.issues[0]?.message ?? "Check the password fields.",
      );
      return;
    }

    setIsSavingPassword(true);
    try {
      const result = await authClient.changePassword({
        currentPassword: validation.data.currentPassword,
        newPassword: validation.data.newPassword,
        revokeOtherSessions: true,
      });

      if (result.error) {
        setPasswordError(
          result.error.message ?? "Could not change your password.",
        );
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setIsChangingPassword(false);
      toast.success("Password changed. Other sessions were signed out.");
    } catch {
      setPasswordError("Could not change your password. Please try again.");
    } finally {
      setIsSavingPassword(false);
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            Your account name and email address.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:gap-12">
            <div>
              <p className="text-sm text-muted-foreground">Name</p>
              <p className="mt-1 font-medium">{profileName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="mt-1 font-medium">{user.email}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {isEmailVerified ? "Verified" : "Not verified"}
              </p>
            </div>
          </div>

          {!isEditingName ? (
            <div>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setNameInput(profileName);
                  setNameError("");
                  setIsEditingName(true);
                }}
              >
                Edit name
              </Button>
            </div>
          ) : (
            <form onSubmit={handleNameSubmit} className="flex flex-col gap-4">
              <FieldGroup>
                <Field data-invalid={Boolean(nameError)}>
                  <FieldLabel htmlFor="settings-name">Name</FieldLabel>
                  <Input
                    id="settings-name"
                    value={nameInput}
                    onChange={(event) => setNameInput(event.target.value)}
                    autoComplete="name"
                    maxLength={100}
                    required
                    aria-invalid={Boolean(nameError)}
                  />
                  {nameError && <FieldError>{nameError}</FieldError>}
                </Field>
              </FieldGroup>
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={isSavingName} variant="outline">
                  {isSavingName && <Spinner data-icon="inline-start" />}
                  {isSavingName ? "Saving..." : "Save name"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSavingName}
                  onClick={() => {
                    setNameInput(profileName);
                    setNameError("");
                    setIsEditingName(false);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}

          {!isEmailVerified && (
            <div className="flex flex-col gap-3 rounded-xl border p-4">
              <div>
                <p className="font-medium">Verify your email</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {isCodeSent
                    ? `We sent a 6-digit code to ${user.email}. Enter it below.`
                    : "Confirm this email belongs to you. We will send a 6-digit code to it."}
                </p>
              </div>
              {!isCodeSent ? (
                <div>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isSendingCode}
                    onClick={handleSendVerificationCode}
                  >
                    {isSendingCode && <Spinner data-icon="inline-start" />}
                    {isSendingCode ? "Sending..." : "Send verification code"}
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleVerifyEmail} className="flex flex-col gap-3">
                  <Field>
                    <FieldLabel htmlFor="settings-otp">Verification code</FieldLabel>
                    <Input
                      id="settings-otp"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      placeholder="123456"
                      maxLength={6}
                      value={otp}
                      onChange={(event) =>
                        setOtp(event.target.value.replaceAll(/\D/g, "").slice(0, 6))
                      }
                      required
                    />
                  </Field>
                  <div className="flex flex-wrap gap-2">
                    <Button type="submit" variant="outline" disabled={isVerifying}>
                      {isVerifying && <Spinner data-icon="inline-start" />}
                      {isVerifying ? "Verifying..." : "Verify email"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={isSendingCode || resendIn > 0}
                      onClick={handleSendVerificationCode}
                    >
                      {resendIn > 0 ? `Resend code (${resendIn}s)` : "Resend code"}
                    </Button>
                  </div>
                </form>
              )}
              {verifyError && <FieldError>{verifyError}</FieldError>}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Password and security</CardTitle>
          <CardDescription>
            Passwords are hidden. Changing your password signs out other active
            sessions.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          {!isChangingPassword ? (
            <div>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setPasswordError("");
                  setIsChangingPassword(true);
                }}
              >
                Change password
              </Button>
            </div>
          ) : (
            <form
              onSubmit={handlePasswordSubmit}
              className="flex flex-col gap-5"
            >
              <FieldGroup className="gap-4">
                <PasswordField
                  id="current-password"
                  label="Current password"
                  value={currentPassword}
                  onChange={setCurrentPassword}
                  autoComplete="current-password"
                />
                <PasswordField
                  id="new-password"
                  label="New password"
                  value={newPassword}
                  onChange={setNewPassword}
                  autoComplete="new-password"
                />
                <PasswordField
                  id="confirm-password"
                  label="Confirm new password"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  autoComplete="new-password"
                />
              </FieldGroup>

              {passwordError && <FieldError>{passwordError}</FieldError>}

              <div className="flex flex-wrap gap-2">
                <Button
                  type="submit"
                  disabled={isSavingPassword}
                  variant="outline"
                >
                  {isSavingPassword && <Spinner data-icon="inline-start" />}
                  {isSavingPassword ? "Updating..." : "Save new password"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSavingPassword}
                  onClick={() => {
                    setCurrentPassword("");
                    setNewPassword("");
                    setConfirmPassword("");
                    setPasswordError("");
                    setIsChangingPassword(false);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </>
  );
}

interface PasswordFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: "current-password" | "new-password";
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
}: PasswordFieldProps) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        type="password"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        minLength={8}
        required
      />
    </Field>
  );
}
