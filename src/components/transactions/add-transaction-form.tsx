"use client";

import { useCallback, useState, type FormEvent } from "react";
import { Mic, MicOff, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import Input from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { api } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-client";
import {
  detectVoiceLanguage,
  parseVoiceTransaction,
  type ParsedVoiceTransaction,
} from "@/lib/parse-voice-transaction";
import { isValidAmount } from "@/lib/validation";
import type { Category } from "@/types/dashboard";

interface AddTransactionFormProps {
  categories: Category[];
  isLoadingCategories: boolean;
  categoriesError: string | null;
  onTransactionAdded: () => void | Promise<void>;
}

type TransactionType = Category["type"];

function getTodayDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function AddTransactionForm({
  categories,
  isLoadingCategories,
  categoriesError,
  onTransactionAdded,
}: AddTransactionFormProps) {
  const [type, setType] = useState<TransactionType>("expense");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [transactionDate, setTransactionDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [voiceResult, setVoiceResult] = useState<ParsedVoiceTransaction | null>(
    null,
  );
  // Burmese first: Kaung speaks Burmese most of the time, and the parser
  // now understands Burmese digits, number words (ထောင်/သိန်း) and
  // categories. English is one tap away. Note: Chrome's speech service
  // handles my-MM best on Android/Chrome; if it mishears, switch to English.
  const [voiceLang, setVoiceLang] = useState<"en-US" | "my-MM">("my-MM");

  const voiceExamples =
    voiceLang === "my-MM"
      ? [
          "နေ့လည်စာ ငါးထောင် သုံးတယ်",
          "တက္ကစီ တစ်သောင်း ပေးတယ် မနေ့က",
          "လစာ ငါးသိန်း ရတယ်",
        ]
      : [
          "Spent 5000 on lunch",
          "Paid 10000 for taxi yesterday",
          "Received salary 500000",
        ];

  const handleVoiceTranscript = useCallback(
    (recognizedTranscript: string) => {
      const result = parseVoiceTransaction(recognizedTranscript, categories);
      setVoiceResult(result);

      if (result.type) setType(result.type);
      if (result.amount !== null) setAmount(String(result.amount));
      if (result.description) setDescription(result.description);
      setTransactionDate(result.transactionDate);

      if (result.categoryId) {
        setCategoryId(result.categoryId);
      } else if (result.categoryName || result.type) {
        setCategoryId("");
      }
    },
    [categories],
  );

  const {
    isSupported,
    isCheckingSupport,
    isListening,
    transcript,
    error: speechError,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition(voiceLang, handleVoiceTranscript);

  const [triedExample, setTriedExample] = useState("");
  const shownTranscript = transcript || triedExample;

  function handleTryExample(example: string) {
    // Parse without the microphone — useful when mic access is blocked,
    // and for checking how a phrase will be understood before speaking it.
    setTriedExample(example);
    handleVoiceTranscript(example);
  }

  function handleVoiceLangChange(nextLang: "en-US" | "my-MM") {
    if (isListening) return;
    setVoiceLang(nextLang);
    setTriedExample("");
    resetTranscript();
    setVoiceResult(null);
  }

  const filteredCategories = categories.filter(
    (category) => category.type === type,
  );
  const formError = error || categoriesError;
  const categoryItems = [
    { label: "Select a category", value: null },
    ...filteredCategories.map((category) => ({
      label: category.name,
      value: category.id,
    })),
  ];

  function handleTypeChange(newType: TransactionType) {
    setType(newType);
    setCategoryId("");
  }

  function handleStartListening() {
    setTriedExample("");
    setVoiceResult(null);
    startListening();
  }

  function handleClearVoiceInput() {
    setTriedExample("");
    resetTranscript();
    setVoiceResult(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!categoryId) {
      setError("Please select a category.");
      return;
    }

    const numericAmount = Number(amount);
    if (!isValidAmount(numericAmount)) {
      setError("Enter a positive amount with no more than two decimal places.");
      return;
    }

    try {
      setIsSubmitting(true);
      await api.createTransaction({
        categoryId,
        description: description.trim(),
        amount: numericAmount,
        transactionDate,
      });

      setType("expense");
      setCategoryId("");
      setDescription("");
      setAmount("");
      setTransactionDate("");
      setError("");
      toast.success("Transaction added successfully.");
      await onTransactionAdded();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to create transaction."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      onFocusCapture={() =>
        setTransactionDate((date) => date || getTodayDate())
      }
      className="flex flex-col gap-5"
    >
      <section
        className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-4"
        aria-label="Voice transaction input"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-medium">Speak your transaction</p>
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {isListening
                ? "Listening... Speak now."
                : "Tap the microphone and speak your transaction."}
            </p>
            <div
              role="group"
              aria-label="Voice language"
              className="mt-2 flex gap-1"
            >
              <Button
                type="button"
                size="sm"
                variant={voiceLang === "my-MM" ? "default" : "outline"}
                aria-pressed={voiceLang === "my-MM"}
                disabled={isListening}
                onClick={() => handleVoiceLangChange("my-MM")}
              >
                မြန်မာ
              </Button>
              <Button
                type="button"
                size="sm"
                variant={voiceLang === "en-US" ? "default" : "outline"}
                aria-pressed={voiceLang === "en-US"}
                disabled={isListening}
                onClick={() => handleVoiceLangChange("en-US")}
              >
                English
              </Button>
            </div>
          </div>

          <div className="flex gap-2">
            {isListening ? (
              <Button
                type="button"
                variant="outline"
                onClick={stopListening}
                aria-label="Stop listening"
              >
                <MicOff data-icon="inline-start" />
                Stop
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={handleStartListening}
                disabled={isCheckingSupport || !isSupported || isSubmitting}
                aria-label="Start voice input"
              >
                <Mic data-icon="inline-start" />
                Speak
              </Button>
            )}

            {shownTranscript && !isListening && (
              <Button
                type="button"
                variant="ghost"
                onClick={handleClearVoiceInput}
                aria-label="Clear voice transcript"
              >
                <RotateCcw data-icon="inline-start" />
                Clear
              </Button>
            )}
          </div>
        </div>

        {isCheckingSupport && (
          <p className="text-sm text-muted-foreground">
            Checking browser voice support...
          </p>
        )}

        {!isCheckingSupport && !isSupported && (
          <FieldDescription>
            Voice input is not supported in this browser. Please use Chrome or
            enter your transaction manually.
          </FieldDescription>
        )}

        {speechError && <FieldError>{speechError}</FieldError>}

        {!isListening && !shownTranscript && (
          <div className="flex flex-col gap-2 border-t pt-3">
            <p className="text-xs font-medium text-muted-foreground">
              Try saying — tap an example to see how it is understood:
            </p>
            <div className="flex flex-wrap gap-2">
              {voiceExamples.map((example) => (
                <Button
                  key={example}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleTryExample(example)}
                >
                  “{example}”
                </Button>
              ))}
            </div>
            {voiceLang === "my-MM" && (
              <p className="text-xs text-muted-foreground">
                Burmese recognition depends on Chrome — if it mishears, switch
                to English above.
              </p>
            )}
          </div>
        )}

        {shownTranscript && (
          <div className="flex flex-col gap-3 border-t pt-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Recognized speech
              </p>
              <p className="mt-1" aria-live="polite">
                “{shownTranscript}”
              </p>
              {shownTranscript &&
                detectVoiceLanguage(shownTranscript) !== voiceLang && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    That sounded like{" "}
                    {detectVoiceLanguage(shownTranscript) === "my-MM"
                      ? "Burmese"
                      : "English"}
                    — switch the language above if the words look wrong.
                  </p>
                )}
            </div>

            {isListening && (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="size-2 animate-pulse rounded-full bg-primary" />
                Listening to your transaction
              </p>
            )}

            {voiceResult && (
              <div className="flex flex-col gap-2 rounded-md bg-background p-3 text-sm">
                <p className="font-medium">
                  Review the transaction details before saving.
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <p>
                    <span className="text-muted-foreground">Amount: </span>
                    {amount
                      ? `${Number(amount).toLocaleString("en-US")} MMK`
                      : "Enter an amount"}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Type: </span>
                    {type === "income" ? "Income" : "Expense"}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Category: </span>
                    {categories.find((category) => category.id === categoryId)
                      ?.name ??
                      (voiceResult.categoryName && type === voiceResult.type
                        ? `${voiceResult.categoryName} (select a matching category)`
                        : "Select a category")}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Description: </span>
                    {description || "Enter a description"}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Date: </span>
                    {transactionDate}
                  </p>
                </div>
                {voiceResult.amount === null && (
                  <FieldDescription>
                    We could not identify one clear amount. Enter or correct it
                    manually.
                  </FieldDescription>
                )}
                {voiceResult.amountAmbiguous && voiceResult.amount !== null && (
                  <FieldDescription>
                    Heard more than one number — check the amount above before
                    saving.
                  </FieldDescription>
                )}
                {voiceResult.missingFields.length > 0 && (
                  <FieldDescription>
                    Still needed:{" "}
                    {voiceResult.missingFields
                      .map((field) =>
                        field === "amount"
                          ? "amount"
                          : field === "category"
                            ? "a matching category (pick one below)"
                            : field === "type"
                              ? "income or expense"
                              : "a description",
                      )
                      .join(", ")}
                    .
                  </FieldDescription>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      <FieldGroup className="grid gap-4 sm:grid-cols-2">
        <Field className="sm:col-span-2">
          <FieldLabel>Transaction type</FieldLabel>
          <div
            role="group"
            aria-label="Transaction type"
            className="flex gap-2"
          >
            <Button
              type="button"
              variant={type === "expense" ? "default" : "outline"}
              aria-pressed={type === "expense"}
              className="flex-1 bg-red-500 hover:bg-red-400"
              onClick={() => handleTypeChange("expense")}
            >
              Expense
            </Button>
            <Button
              type="button"
              variant={type === "income" ? "default" : "outline"}
              aria-pressed={type === "income"}
              className="flex-1 bg-green-500 hover:bg-green-600"
              onClick={() => handleTypeChange("income")}
            >
              Income
            </Button>
          </div>
        </Field>

        <Field>
          <FieldLabel htmlFor="category">Category</FieldLabel>
          <Select
            items={categoryItems}
            value={categoryId || null}
            onValueChange={(value) => setCategoryId(value ?? "")}
            disabled={isLoadingCategories}
          >
            <SelectTrigger id="category" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {categoryItems.map((item) => (
                  <SelectItem key={item.value ?? "empty"} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          {!isLoadingCategories && filteredCategories.length === 0 && (
            <FieldDescription>
              No {type} categories found. Create a category first.
            </FieldDescription>
          )}
        </Field>

        <Field>
          <FieldLabel htmlFor="description">Description</FieldLabel>
          <Input
            id="description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="e.g. Lunch, Salary, Shopping"
            maxLength={500}
            required
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="amount">Amount (MMK)</FieldLabel>
          <Input
            id="amount"
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="Enter amount"
            required
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="transactionDate">Transaction date</FieldLabel>
          <Input
            id="transactionDate"
            type="date"
            value={transactionDate}
            onChange={(event) => setTransactionDate(event.target.value)}
            required
          />
        </Field>
      </FieldGroup>

      {formError && <FieldError>{formError}</FieldError>}
      <Button
        type="submit"
        variant="zinc"
        disabled={
          isSubmitting ||
          isListening ||
          isLoadingCategories ||
          filteredCategories.length === 0
        }
        className="w-full"
      >
        {isSubmitting && <Spinner data-icon="inline-start" />}
        {isSubmitting ? "Saving..." : "Add transaction"}
      </Button>
    </form>
  );
}
