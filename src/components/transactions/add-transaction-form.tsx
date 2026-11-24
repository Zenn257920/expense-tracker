"use client";

import { useCallback, useRef, useState, type FormEvent } from "react";
import { Check, ChevronDown, Mic, MicOff, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field";
import Input from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { formatTransactionDate } from "@/components/transactions/recent-transactions";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { api } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-client";
import { formatAmount } from "@/lib/format";
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
  /** Refresh the lists without closing the dialog (Save & add another). */
  onTransactionSaved?: () => void | Promise<void>;
  onCategoriesChanged?: () => void | Promise<void>;
}

type TransactionType = Category["type"];

type FieldErrors = {
  category?: string;
  amount?: string;
  date?: string;
};

function getTodayDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** "1,250,000" -> 1250000; also tolerates spaces. */
function parseAmountInput(value: string) {
  return Number(value.replaceAll(/[,\s]/g, ""));
}

function focusField(id: string) {
  const element = document.getElementById(id);
  element?.scrollIntoView({ behavior: "smooth", block: "center" });
  if (element instanceof HTMLInputElement) element.focus({ preventScroll: true });
}

export default function AddTransactionForm({
  categories,
  isLoadingCategories,
  categoriesError,
  onTransactionAdded,
  onTransactionSaved,
  onCategoriesChanged,
}: AddTransactionFormProps) {
  const [type, setType] = useState<TransactionType>("expense");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [transactionDate, setTransactionDate] = useState(getTodayDate());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [voiceOpen, setVoiceOpen] = useState(false);
  // Quick-add: "Type" is the default tab; "Voice" shows only the voice
  // section. Switching tabs never clears fields or voice state.
  const [inputMode, setInputMode] = useState<"type" | "voice">("type");
  // Description + date live behind this disclosure — quick-add only needs
  // type, amount and category.
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [voiceResult, setVoiceResult] = useState<ParsedVoiceTransaction | null>(
    null,
  );
  // Burmese first: Kaung speaks Burmese most of the time, and the parser
  // now understands Burmese digits, number words (ထောင်/သိန်း) and
  // categories. English is one tap away. Note: Chrome's speech service
  // handles my-MM best on Android/Chrome; if it mishears, switch to English.
  const [voiceLang, setVoiceLang] = useState<"en-US" | "my-MM">("my-MM");
  const [triedExample, setTriedExample] = useState("");
  const [typedPhrase, setTypedPhrase] = useState("");

  // Fields the user has typed/picked themselves. A voice parse only fills
  // fields that are NOT dirty — it must never overwrite manual input, and
  // never overwrite a manually chosen date.
  const dirtyRef = useRef<Set<string>>(new Set());
  // Fields the last voice parse filled in, so switching language (or
  // clearing the voice input) can take those values back out again.
  const voiceFilledRef = useRef<Set<string>>(new Set());
  const saveAnotherRef = useRef(false);

  function clearVoiceFilledFields() {
    const filled = voiceFilledRef.current;
    const dirty = dirtyRef.current;
    if (filled.has("amount") && !dirty.has("amount")) setAmount("");
    if (filled.has("description") && !dirty.has("description"))
      setDescription("");
    if (filled.has("date") && !dirty.has("date"))
      setTransactionDate(getTodayDate());
    if (filled.has("category") && !dirty.has("category")) setCategoryId("");
    if (filled.has("type") && !dirty.has("type")) setType("expense");
    voiceFilledRef.current = new Set();
  }

  function resetForm() {
    setType("expense");
    setCategoryId("");
    setDescription("");
    setAmount("");
    setTransactionDate(getTodayDate());
    setError("");
    setFieldErrors({});
    setVoiceResult(null);
    setTriedExample("");
    setTypedPhrase("");
    dirtyRef.current = new Set();
    voiceFilledRef.current = new Set();
  }

  function clearFieldError(field: keyof FieldErrors) {
    setFieldErrors((prev) =>
      prev[field] ? { ...prev, [field]: undefined } : prev,
    );
  }

  async function handleCreateCategory(name: string) {
    const trimmedName = name.trim();
    if (!trimmedName || isCreatingCategory) return;
    try {
      setIsCreatingCategory(true);
      setError("");
      const created = await api.createCategory({
        name: trimmedName,
        type,
      });
      await onCategoriesChanged?.();
      // Creating a new category replaces the current selection.
      setCategoryId(created.id);
      dirtyRef.current.add("category");
      clearFieldError("category");
      setNewCategoryName("");
      setShowNewCategory(false);
      toast.success(`Category "${created.name}" created.`);
    } catch (err) {
      setError(
        getApiErrorMessage(err, "Could not create that category. Try again."),
      );
    } finally {
      setIsCreatingCategory(false);
    }
  }

  async function handleCreateSuggestedCategory() {
    if (!voiceResult?.categoryName || !voiceResult.type) return;
    await handleCreateCategory(voiceResult.categoryName);
  }

  const handleVoiceTranscript = useCallback(
    (recognizedTranscript: string) => {
      const result = parseVoiceTransaction(recognizedTranscript, categories);
      setVoiceResult(result);
      setVoiceOpen(true);

      const dirty = dirtyRef.current;
      const filled = new Set<string>();
      if (result.type && !dirty.has("type")) {
        setType(result.type);
        filled.add("type");
      }
      if (result.amount !== null && !dirty.has("amount")) {
        setAmount(String(result.amount));
        filled.add("amount");
      }
      if (result.description && !dirty.has("description")) {
        setDescription(result.description);
        filled.add("description");
      }
      if (!dirty.has("date")) {
        setTransactionDate(result.transactionDate);
        filled.add("date");
      }
      if (result.categoryId && !dirty.has("category")) {
        setCategoryId(result.categoryId);
        filled.add("category");
      } else if (!dirty.has("category") && (result.categoryName || result.type)) {
        setCategoryId("");
      }
      voiceFilledRef.current = filled;
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

  const shownTranscript = transcript || triedExample;

  function handleTryExample(example: string) {
    // Parse without the microphone — useful when mic access is blocked,
    // and for checking how a phrase will be understood before speaking it.
    setTriedExample(example);
    handleVoiceTranscript(example);
  }

  function handleParseTypedPhrase() {
    const phrase = typedPhrase.trim();
    if (!phrase || isListening) return;
    handleTryExample(phrase);
  }

  function handleVoiceLangChange(nextLang: "en-US" | "my-MM") {
    if (isListening) return;
    setVoiceLang(nextLang);
    setTriedExample("");
    resetTranscript();
    setVoiceResult(null);
    clearVoiceFilledFields();
  }

  const filteredCategories = categories.filter(
    (category) => category.type === type,
  );
  const formError = error || categoriesError;

  function handleTypeChange(newType: TransactionType) {
    dirtyRef.current.add("type");
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
    setTypedPhrase("");
    resetTranscript();
    setVoiceResult(null);
    clearVoiceFilledFields();
  }

  function handleAmountChange(value: string) {
    dirtyRef.current.add("amount");
    setAmount(value.replaceAll(/[^0-9.,\s]/g, ""));
    clearFieldError("amount");
  }

  function handleAmountFocus() {
    // Show the plain number while editing so typing appends correctly.
    setAmount((prev) => prev.replaceAll(/[,\s]/g, ""));
  }

  function handleAmountBlur() {
    const numeric = parseAmountInput(amount);
    if (amount.trim() && Number.isFinite(numeric) && numeric > 0) {
      setAmount(formatAmount(numeric));
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const nextErrors: FieldErrors = {};
    if (!categoryId) nextErrors.category = "Category ရွေးပေးပါ";
    const numericAmount = parseAmountInput(amount);
    if (!isValidAmount(numericAmount)) {
      nextErrors.amount = "ငွေပမာဏ ရိုက်ထည့်ပါ";
    }
    if (!transactionDate) nextErrors.date = "Date ရွေးပေးပါ";
    if (Object.keys(nextErrors).length > 0) {
      // Amount/category/date all live in the Type tab — switch there so
      // the inline error is actually visible when submitting from Voice.
      setInputMode("type");
      // The date field lives behind the "More details" disclosure — open
      // it so a date error is actually visible.
      if (nextErrors.date) setDetailsOpen(true);
      setFieldErrors(nextErrors);
      if (nextErrors.category) focusField("category");
      else if (nextErrors.amount) focusField("amount");
      else focusField("transactionDate");
      return;
    }

    const saveAnother = saveAnotherRef.current;
    saveAnotherRef.current = false;

    try {
      setIsSubmitting(true);
      await api.createTransaction({
        categoryId,
        // Empty description is fine — the server defaults it to the
        // category name.
        description: description.trim(),
        amount: numericAmount,
        transactionDate,
      });

      toast.success("Transaction added successfully.");
      resetForm();
      if (saveAnother && onTransactionSaved) {
        await onTransactionSaved();
      } else {
        await onTransactionAdded();
      }
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to create transaction."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div role="group" aria-label="Input method" className="flex gap-2">
        <Button
          type="button"
          variant={inputMode === "type" ? "default" : "outline"}
          aria-pressed={inputMode === "type"}
          className="min-h-11 flex-1"
          onClick={() => setInputMode("type")}
        >
          Type
        </Button>
        <Button
          type="button"
          variant={inputMode === "voice" ? "default" : "outline"}
          aria-pressed={inputMode === "voice"}
          className="min-h-11 flex-1"
          onClick={() => {
            // The tab replaces the old "Add by voice" disclosure, so
            // entering the Voice tab opens the voice section.
            setVoiceOpen(true);
            setInputMode("voice");
          }}
        >
          <Mic data-icon="inline-start" />
          Voice
        </Button>
      </div>

      {inputMode === "voice" && voiceOpen && (
        <section
          className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-4"
          aria-label="Voice transaction input"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
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
                    size="lg"
                    variant={voiceLang === "my-MM" ? "default" : "outline"}
                    aria-pressed={voiceLang === "my-MM"}
                    disabled={isListening}
                    onClick={() => handleVoiceLangChange("my-MM")}
                  >
                    မြန်မာ
                  </Button>
                  <Button
                    type="button"
                    size="lg"
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

            {!isListening && (
              <div className="flex flex-col gap-2 border-t pt-3">
                <p className="text-xs font-medium text-muted-foreground">
                  Or type what you would say — no microphone needed:
                </p>
                <div className="flex gap-2">
                  <Input
                    value={typedPhrase}
                    onChange={(event) => setTypedPhrase(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        handleParseTypedPhrase();
                      }
                    }}
                    enterKeyHint="go"
                    placeholder={
                      voiceLang === "my-MM"
                        ? "ဥပမာ: နေ့လည်စာ ငါးထောင် သုံးတယ်"
                        : "e.g. Spent 5000 on lunch"
                    }
                    aria-label="Type your transaction"
                    maxLength={500}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleParseTypedPhrase}
                    disabled={!typedPhrase.trim() || isSubmitting}
                  >
                    Parse
                  </Button>
                </div>
              </div>
            )}

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
                      size="lg"
                      onClick={() => handleTryExample(example)}
                    >
                      “{example}”
                    </Button>
                  ))}
                </div>
                {voiceLang === "my-MM" && (
                  <p className="text-xs text-muted-foreground">
                    Burmese recognition depends on Chrome — if it mishears, switch
                    to English above, or type it instead.
                  </p>
                )}
                {voiceLang === "en-US" && (
                  <p className="text-xs text-muted-foreground">
                    Voice works best in the Chrome app — in an in-app browser it
                    often fails. Typing works everywhere.
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
                    {voiceResult.confidence !== "high" && (
                      <FieldDescription className="font-medium text-foreground">
                        Please double-check the details below — the phrase
                        wasn&apos;t clear.
                      </FieldDescription>
                    )}
                    <div className="grid gap-2 sm:grid-cols-2">
                      <p>
                        <span className="text-muted-foreground">Amount: </span>
                        {amount && Number.isFinite(parseAmountInput(amount))
                          ? `${formatAmount(parseAmountInput(amount))} MMK`
                          : "Enter an amount"}
                      </p>
                      <p>
                        <span className="text-muted-foreground">Type: </span>
                        {voiceResult.type
                          ? type === "income"
                            ? "Income"
                            : "Expense"
                          : "Not sure — pick in the Type tab"}
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
                        {transactionDate
                          ? formatTransactionDate(transactionDate)
                          : "Pick a date"}
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
                                ? "a matching category (pick one in the Type tab)"
                                : field === "type"
                                  ? "income or expense"
                                  : "a description",
                          )
                          .join(", ")}
                        .
                      </FieldDescription>
                    )}
                    {voiceResult.categoryName &&
                      !categoryId &&
                      voiceResult.type &&
                      type === voiceResult.type && (
                        <div className="flex flex-wrap items-center gap-2">
                          <FieldDescription>
                            No “{voiceResult.categoryName}” category yet.
                          </FieldDescription>
                          <Button
                            type="button"
                            size="lg"
                            variant="outline"
                            onClick={handleCreateSuggestedCategory}
                            disabled={isCreatingCategory || isSubmitting}
                          >
                            {isCreatingCategory && <Spinner data-icon="inline-start" />}
                            Create “{voiceResult.categoryName}” category
                          </Button>
                        </div>
                      )}
                    {!voiceResult.categoryName && !categoryId && (
                      <FieldDescription>
                        No category was heard in that phrase — switch to the
                        Type tab and use “+ New category” under Category to
                        make one (e.g. Outing).
                      </FieldDescription>
                    )}
                  </div>
                )}
              </div>
            )}
        </section>
      )}

      {inputMode === "type" && (
        <FieldGroup className="grid gap-4">
          <Field>
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
              className={
                type === "expense"
                  ? "min-h-11 flex-1 bg-red-500 hover:bg-red-400"
                  : "min-h-11 flex-1 bg-transparent text-muted-foreground"
              }
              onClick={() => handleTypeChange("expense")}
            >
              {type === "expense" && <Check data-icon="inline-start" />}
              Expense
            </Button>
            <Button
              type="button"
              variant={type === "income" ? "default" : "outline"}
              aria-pressed={type === "income"}
              className={
                type === "income"
                  ? "min-h-11 flex-1 bg-green-500 hover:bg-green-600"
                  : "min-h-11 flex-1 bg-transparent text-muted-foreground"
              }
              onClick={() => handleTypeChange("income")}
            >
              {type === "income" && <Check data-icon="inline-start" />}
              Income
            </Button>
          </div>
        </Field>

        <Field data-invalid={Boolean(fieldErrors.amount)}>
          <FieldLabel htmlFor="amount">Amount (MMK)</FieldLabel>
          <Input
            id="amount"
            type="text"
            inputMode="decimal"
            className="h-14 text-2xl font-semibold tabular-nums"
            value={amount}
            onChange={(event) => handleAmountChange(event.target.value)}
            onFocus={handleAmountFocus}
            onBlur={handleAmountBlur}
            placeholder="e.g. 5,000"
          />
          {fieldErrors.amount && <FieldError>{fieldErrors.amount}</FieldError>}
        </Field>

        <Field data-invalid={Boolean(fieldErrors.category)}>
          <FieldTitle id="category-label">Category</FieldTitle>
          <div
            id="category"
            role="group"
            aria-labelledby="category-label"
            className="flex min-h-11 flex-wrap items-center gap-2"
          >
            {isLoadingCategories ? (
              <p className="text-sm text-muted-foreground">
                Loading categories…
              </p>
            ) : filteredCategories.length === 0 ? (
              <FieldDescription>
                No {type} categories found. Create a category first.
              </FieldDescription>
            ) : (
              filteredCategories.map((category) => (
                <Button
                  key={category.id}
                  type="button"
                  variant={categoryId === category.id ? "default" : "outline"}
                  aria-pressed={categoryId === category.id}
                  onClick={() => {
                    dirtyRef.current.add("category");
                    setCategoryId(category.id);
                    clearFieldError("category");
                  }}
                >
                  {categoryId === category.id && (
                    <Check data-icon="inline-start" />
                  )}
                  {category.name}
                </Button>
              ))
            )}
          </div>
          {fieldErrors.category && (
            <FieldError>{fieldErrors.category}</FieldError>
          )}
          {!showNewCategory ? (
            <Button
              type="button"
              variant="ghost"
              size="lg"
              className="w-fit px-0"
              onClick={() => {
                setNewCategoryName(
                  voiceResult?.categoryName && !categoryId
                    ? voiceResult.categoryName
                    : "",
                );
                setShowNewCategory(true);
              }}
              disabled={isCreatingCategory || isSubmitting}
            >
              + New {type} category
            </Button>
          ) : (
            <div className="flex gap-2">
              <Input
                value={newCategoryName}
                onChange={(event) => setNewCategoryName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void handleCreateCategory(newCategoryName);
                  }
                }}
                placeholder={
                  type === "income" ? "e.g. Salary" : "e.g. Food, Outing"
                }
                aria-label={`New ${type} category name`}
                maxLength={100}
                autoFocus
              />
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => void handleCreateCategory(newCategoryName)}
                disabled={!newCategoryName.trim() || isCreatingCategory}
              >
                {isCreatingCategory && <Spinner data-icon="inline-start" />}
                Create
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="lg"
                onClick={() => {
                  setShowNewCategory(false);
                  setNewCategoryName("");
                }}
                disabled={isCreatingCategory}
              >
                Cancel
              </Button>
            </div>
          )}
        </Field>

        <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-4">
          <button
            type="button"
            onClick={() => setDetailsOpen((open) => !open)}
            aria-expanded={detailsOpen}
            className="flex min-h-11 items-center gap-2 text-left font-medium"
          >
            More details
            <ChevronDown
              className={`size-4 transition-transform ${detailsOpen ? "rotate-180" : ""}`}
            />
          </button>
          {detailsOpen && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="description">Description</FieldLabel>
                <Input
                  id="description"
                  value={description}
                  onChange={(event) => {
                    dirtyRef.current.add("description");
                    setDescription(event.target.value);
                  }}
                  placeholder="e.g. Lunch, Salary, Shopping"
                  maxLength={500}
                />
                <FieldDescription>
                  Optional — defaults to the category name.
                </FieldDescription>
              </Field>

              <Field data-invalid={Boolean(fieldErrors.date)}>
                <FieldLabel htmlFor="transactionDate">
                  Transaction date
                </FieldLabel>
                <Input
                  id="transactionDate"
                  type="date"
                  value={transactionDate}
                  onChange={(event) => {
                    dirtyRef.current.add("date");
                    setTransactionDate(event.target.value);
                    clearFieldError("date");
                  }}
                  required
                />
                {fieldErrors.date && (
                  <FieldError>{fieldErrors.date}</FieldError>
                )}
              </Field>
            </div>
          )}
        </div>
        </FieldGroup>
      )}

      {formError && <FieldError>{formError}</FieldError>}
      <div className="sticky bottom-0 -mx-4 -mb-4 flex flex-col gap-2 border-t bg-popover px-4 pt-3 pb-4">
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
          onClick={() => {
            saveAnotherRef.current = false;
          }}
        >
          {isSubmitting && <Spinner data-icon="inline-start" />}
          {isSubmitting ? "Saving..." : "Add transaction"}
        </Button>
        <Button
          type="submit"
          variant="outline"
          disabled={
            isSubmitting ||
            isListening ||
            isLoadingCategories ||
            filteredCategories.length === 0
          }
          className="w-full"
          onClick={() => {
            saveAnotherRef.current = true;
          }}
        >
          Save &amp; add another
        </Button>
      </div>
    </form>
  );
}
