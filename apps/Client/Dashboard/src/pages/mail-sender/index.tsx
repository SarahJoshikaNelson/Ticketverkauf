import { useState, useEffect, useRef } from "react";
import { useKeycloak } from "@react-keycloak/web";
import authFetch from "@/utils/authfetch";
import { getFetchUrl } from "@/utils/getFetchUrl";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Loader2, Mail, Send, User, Hash, Link as LinkIcon, Heading1, Heading2, Bold, Italic, Sparkles, X } from "lucide-react";

interface BulkMailRequest {
  subject: string;
  content: string;
  targetStatuses: string[] | null;
  includeBills: boolean;
}

interface BulkMailResponse {
  totalRecipients: number;
  successCount: number;
  failureCount: number;
  failedOrderIds: string[];
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Aktiv",
  CONFIRMED: "Bestätigt",
  WAITING: "Wartend",
  PAID: "Bezahlt",
  DONE: "Abgeschlossen",
};

function MailSender() {
  const { keycloak } = useKeycloak();
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [includeBills, setIncludeBills] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [availableStatuses, setAvailableStatuses] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(true);
  const [markdownMode, setMarkdownMode] = useState(false);
  const [showAiPrompt, setShowAiPrompt] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Load available statuses on mount
  useEffect(() => {
    (async () => {
      try {
        const response = await authFetch(
          getFetchUrl("api/v2/mail-sender/available-statuses"),
          keycloak.token ?? ""
        );

        if (response.ok) {
          const statuses = await response.json();
          setAvailableStatuses(statuses);
        } else {
          toast.error("Fehler beim Laden der verfügbaren Status");
        }
      } catch (error) {
        console.error("Error loading statuses:", error);
        toast.error("Fehler beim Laden der verfügbaren Status");
      }
    })();
  }, [keycloak.token]);

  const handleStatusToggle = (status: string) => {
    setSelectedStatuses((prev) => {
      if (prev.includes(status)) {
        const updated = prev.filter((s) => s !== status);
        setSelectAll(updated.length === 0);
        return updated;
      } else {
        const updated = [...prev, status];
        setSelectAll(false);
        return updated;
      }
    });
  };

  const handleSelectAllToggle = () => {
    if (selectAll) {
      // If currently "all" is selected, deselect all
      setSelectedStatuses([]);
      setSelectAll(false);
    } else {
      // Select all
      setSelectedStatuses([]);
      setSelectAll(true);
    }
  };

  const handleSendMail = async () => {
    // Validation
    if (!subject.trim()) {
      toast.error("Bitte geben Sie einen Betreff ein");
      return;
    }

    if (!content.trim()) {
      toast.error("Bitte geben Sie einen E-Mail-Inhalt ein");
      return;
    }

    if (!selectAll && selectedStatuses.length === 0) {
      toast.error("Bitte wählen Sie mindestens einen Status aus");
      return;
    }

    setIsSending(true);

    try {
      // Convert markdown to HTML if markdown mode is enabled
      const finalContent = markdownMode ? markdownToHtml(content) : content;
      
      const request: BulkMailRequest = {
        subject,
        content: finalContent,
        targetStatuses: selectAll ? null : selectedStatuses,
        includeBills,
      };

      const response = await authFetch(
        getFetchUrl("api/v2/mail-sender/send"),
        keycloak.token ?? "",
        {
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(request),
        },
        "POST"
      );

      if (response.ok) {
        const result: BulkMailResponse = await response.json();

        if (result.failureCount === 0) {
          toast.success("Versand erfolgreich abgeschlossen");
        } else {
          toast.error(`Versand fehlgeschlagen: Error #${String(result.failureCount).padStart(4, '0')}`);
        }

        // Clear form on success if all emails sent
        if (result.failureCount === 0) {
          setSubject("");
          setContent("");
          setIncludeBills(false);
          setSelectAll(true);
          setSelectedStatuses([]);
        }
      } else {
        const errorText = await response.text();
        toast.error(`Versand fehlgeschlagen: ${errorText || "Error #0001"}`);
      }
    } catch (error) {
      console.error("Error sending bulk mail:", error);
      toast.error("Versand fehlgeschlagen: Error #0001");
    } finally {
      setIsSending(false);
    }
  };

  // Insert text at cursor position in textarea
  const insertAtCursor = (textToInsert: string) => {
    const textarea = contentTextareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const textBefore = content.substring(0, start);
    const textAfter = content.substring(end);
    
    const newContent = textBefore + textToInsert + textAfter;
    setContent(newContent);
    
    // Set cursor position after inserted text
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + textToInsert.length, start + textToInsert.length);
    }, 0);
  };

  const insertVariable = (variable: string) => {
    insertAtCursor(`{{${variable}}}`);
  };

  const insertLink = () => {
    insertAtCursor('<a href="https://example.com">Link-Text</a>');
  };

  const insertHeading = (level: number) => {
    insertAtCursor(`<h${level}>Überschrift</h${level}>`);
  };

  const insertBold = () => {
    const textarea = contentTextareaRef.current;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    
    if (markdownMode) {
      if (selectedText) {
        const textBefore = content.substring(0, start);
        const textAfter = content.substring(end);
        setContent(textBefore + `**${selectedText}**` + textAfter);
      } else {
        insertAtCursor('**Fetter Text**');
      }
    } else {
      if (selectedText) {
        const textBefore = content.substring(0, start);
        const textAfter = content.substring(end);
        setContent(textBefore + `<strong>${selectedText}</strong>` + textAfter);
      } else {
        insertAtCursor('<strong>Fetter Text</strong>');
      }
    }
  };

  const insertItalic = () => {
    const textarea = contentTextareaRef.current;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    
    if (markdownMode) {
      if (selectedText) {
        const textBefore = content.substring(0, start);
        const textAfter = content.substring(end);
        setContent(textBefore + `*${selectedText}*` + textAfter);
      } else {
        insertAtCursor('*Kursiver Text*');
      }
    } else {
      if (selectedText) {
        const textBefore = content.substring(0, start);
        const textAfter = content.substring(end);
        setContent(textBefore + `<em>${selectedText}</em>` + textAfter);
      } else {
        insertAtCursor('<em>Kursiver Text</em>');
      }
    }
  };

  // Simple markdown to HTML converter
  const markdownToHtml = (markdown: string): string => {
    let html = markdown;
    
    // Headers
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
    
    // Bold
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    
    // Italic
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    
    // Links
    html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');
    
    // Line breaks (preserve)
    html = html.replace(/\n/g, '\n');
    
    return html;
  };

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) {
      toast.error("Bitte geben Sie einen Prompt ein");
      return;
    }

    setIsGenerating(true);

    try {
      const response = await authFetch(
        getFetchUrl("api/v2/mail-sender/generate-ai-content"),
        keycloak.token ?? "",
        {
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ prompt: aiPrompt }),
        },
        "POST"
      );

      if (response.ok) {
        const result = await response.json();
        
        // Set both subject and content if provided
        if (result.subject) {
          setSubject(result.subject);
        }
        if (result.content) {
          setContent(result.content);
        }
        
        setShowAiPrompt(false);
        setAiPrompt("");
        
        if (result.subject && result.content) {
          toast.success("Betreff und Inhalt erfolgreich generiert!");
        } else if (result.content) {
          toast.success("Inhalt erfolgreich generiert!");
        } else {
          toast.success("Text erfolgreich generiert!");
        }
      } else {
        const error = await response.json();
        toast.error(`KI-Generierung fehlgeschlagen: ${error.error || "Unbekannter Fehler"}`);
      }
    } catch (error) {
      console.error("Error generating AI content:", error);
      toast.error("Fehler bei der KI-Generierung");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 pr-2 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Mail className="w-6 h-6" />
          Massen-E-Mail-Versand
        </h1>
        <p className="text-muted-foreground mt-1">
          Senden Sie personalisierte E-Mails an Kunden basierend auf ihrem Bestellstatus
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>E-Mail erstellen</CardTitle>
              <CardDescription>
                Verfassen Sie Ihre Nachricht und wählen Sie die Empfänger aus
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="default"
              onClick={() => setShowAiPrompt(!showAiPrompt)}
              disabled={isSending}
              className="shrink-0"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              KI-Generierung
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="subject">Betreff *</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="z.B. Wichtige Information zu Ihrer Bestellung"
              disabled={isSending}
            />
            <p className="text-xs text-muted-foreground">
              Verfügbare Variablen: <code className="bg-muted px-1 py-0.5 rounded">{"{{fullName}}"}</code>, <code className="bg-muted px-1 py-0.5 rounded">{"{{orderId}}"}</code>
            </p>
          </div>

          {/* Content */}
          <div className="space-y-2">
            <Label htmlFor="content">Inhalt *</Label>

            {/* AI Prompt Input */}
            {showAiPrompt && (
              <Card className="border-purple-300 bg-purple-50 dark:bg-purple-950/20 dark:border-purple-800">
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      <Label htmlFor="ai-prompt" className="text-sm font-medium text-foreground">
                        KI-Prompt eingeben
                      </Label>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAiPrompt(false)}
                      className="h-6 w-6 p-0 text-foreground hover:text-foreground"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <textarea
                    id="ai-prompt"
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="z.B. 'Schreibe eine freundliche Zahlungserinnerung für Kunden mit ausstehender Zahlung'"
                    className="flex min-h-[100px] w-full rounded-md border border-input bg-white dark:bg-accent px-3 py-2 text-sm text-primary shadow-xs ring-offset-background placeholder:text-gray-500 dark:placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={isGenerating}
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowAiPrompt(false);
                        setAiPrompt("");
                      }}
                      disabled={isGenerating}
                      className="text-foreground"
                    >
                      Abbrechen
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAiGenerate}
                      disabled={isGenerating || !aiPrompt.trim()}
                      className="bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          Generiere...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3 h-3 mr-1" />
                          Generieren
                        </>
                      )}
                    </Button>
                  </div>
                  <div className="space-y-1 text-xs text-gray-700 dark:text-gray-300">
                    <p className="font-medium">💡 Hinweise:</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>Betreff und Inhalt werden automatisch generiert</li>
                      <li>Die KI kennt folgende Variablen: <code className="bg-white dark:bg-gray-800 px-1 py-0.5 rounded text-foreground">{"{{"} fullName{"}}"}</code>, <code className="bg-white dark:bg-gray-800 px-1 py-0.5 rounded text-foreground">{"{{"} orderId{"}}"}</code></li>
                      <li>HTML-Formatierung wird automatisch verwendet</li>
                      <li>Sie können den generierten Text nachträglich bearbeiten</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Markdown Mode Toggle */}
            <div className="flex items-center space-x-2 mb-2">
              <Checkbox
                id="markdown-mode"
                checked={markdownMode}
                onCheckedChange={(checked) => setMarkdownMode(checked as boolean)}
                disabled={isSending}
              />
              <label
                htmlFor="markdown-mode"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Markdown-Modus
              </label>
              <span className="text-xs text-muted-foreground">
                ({markdownMode ? 'Markdown-Syntax wird verwendet' : 'HTML-Tags werden verwendet'})
              </span>
            </div>

            {/* Formatting Toolbar */}
            <div className="flex flex-wrap gap-1 p-2 border border-input rounded-md bg-muted/30">
              <div className="flex gap-1 items-center">
                <span className="text-xs text-muted-foreground mr-2">Variablen:</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => insertVariable('fullName')}
                  disabled={isSending}
                  className="h-8 px-2"
                  title="Name einfügen"
                >
                  <User className="w-3 h-3 mr-1" />
                  Name
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => insertVariable('orderId')}
                  disabled={isSending}
                  className="h-8 px-2"
                  title="Bestellungs-ID einfügen"
                >
                  <Hash className="w-3 h-3 mr-1" />
                  ID
                </Button>
              </div>
              
              <Separator orientation="vertical" className="h-8" />
              
              <div className="flex gap-1 items-center">
                <span className="text-xs text-muted-foreground mr-2">Format:</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={insertBold}
                  disabled={isSending}
                  className="h-8 px-2"
                  title="Fett"
                >
                  <Bold className="w-3 h-3" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={insertItalic}
                  disabled={isSending}
                  className="h-8 px-2"
                  title="Kursiv"
                >
                  <Italic className="w-3 h-3" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (markdownMode) {
                      insertAtCursor('# Überschrift');
                    } else {
                      insertHeading(1);
                    }
                  }}
                  disabled={isSending}
                  className="h-8 px-2"
                  title={markdownMode ? "Große Überschrift (# Text)" : "Große Überschrift"}
                >
                  <Heading1 className="w-3 h-3" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (markdownMode) {
                      insertAtCursor('## Überschrift');
                    } else {
                      insertHeading(2);
                    }
                  }}
                  disabled={isSending}
                  className="h-8 px-2"
                  title={markdownMode ? "Kleine Überschrift (## Text)" : "Kleine Überschrift"}
                >
                  <Heading2 className="w-3 h-3" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (markdownMode) {
                      insertAtCursor('[Link-Text](https://example.com)');
                    } else {
                      insertLink();
                    }
                  }}
                  disabled={isSending}
                  className="h-8 px-2"
                  title={markdownMode ? "Link einfügen ([Text](URL))" : "Link einfügen"}
                >
                  <LinkIcon className="w-3 h-3" />
                </Button>
              </div>
            </div>

            <textarea
              ref={contentTextareaRef}
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Geben Sie hier den Inhalt Ihrer E-Mail ein..."
              className="flex min-h-[200px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isSending}
            />
            <p className="text-xs text-muted-foreground">
              {markdownMode 
                ? 'Markdown-Syntax wird automatisch zu HTML konvertiert. Zeilenumbrüche werden erhalten.'
                : 'Die E-Mail wird als HTML-Nachricht gesendet. Zeilenumbrüche werden automatisch formatiert.'}
            </p>
            {markdownMode && (
              <div className="text-xs text-muted-foreground space-y-1 bg-muted/50 p-2 rounded-md">
                <p className="font-medium">Markdown Syntax:</p>
                <p>• <code className="bg-muted px-1">**fett**</code> → <strong>fett</strong></p>
                <p>• <code className="bg-muted px-1">*kursiv*</code> → <em>kursiv</em></p>
                <p>• <code className="bg-muted px-1"># Überschrift</code> → Große Überschrift</p>
                <p>• <code className="bg-muted px-1">## Überschrift</code> → Kleine Überschrift</p>
                <p>• <code className="bg-muted px-1">[Text](URL)</code> → Link</p>
              </div>
            )}
          </div>

          <Separator />

          {/* Status Filter */}
          <div className="space-y-3">
            <Label>Empfänger nach Status filtern *</Label>
            <div className="space-y-2">
              {/* Select All Option */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="status-all"
                  checked={selectAll}
                  onCheckedChange={handleSelectAllToggle}
                  disabled={isSending}
                  className="data-[state=checked]:bg-green-500 data-[state=checked]:text-white text-black!"
                />
                <label
                  htmlFor="status-all"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Alle Kunden (unabhängig vom Status)
                </label>
              </div>

              {/* Individual Statuses */}
              {availableStatuses.map((status) => (
                <div key={status} className="flex items-center space-x-2 ml-6">
                  <Checkbox
                    id={`status-${status}`}
                    checked={!selectAll && selectedStatuses.includes(status)}
                    onCheckedChange={() => handleStatusToggle(status)}
                    disabled={isSending || selectAll}
                  />
                  <label
                    htmlFor={`status-${status}`}
                    className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {STATUS_LABELS[status] || status}
                  </label>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Stornierte Bestellungen werden nie berücksichtigt
            </p>
          </div>

          <Separator />

          {/* Include Bills Option */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="include-bills"
                checked={includeBills}
                onCheckedChange={(checked) => setIncludeBills(checked as boolean)}
                disabled={isSending}
              />
              <label
                htmlFor="include-bills"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Rechnungen als Anhang hinzufügen
              </label>
            </div>
            <p className="text-xs text-muted-foreground ml-6">
              Rechnungen werden nur an Kunden mit dem Status "Bezahlt" angehängt, sofern verfügbar
            </p>
          </div>

          {/* Send Button */}
          <div className="flex justify-end pt-4">
            <Button
              onClick={handleSendMail}
              disabled={isSending}
              className="min-w-32 text-white"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Senden...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  E-Mails senden
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}

export default MailSender;

