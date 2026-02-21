import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, X, Bot, Volume2, VolumeX, MessageSquare, Mic, Loader2, Play, Square, Key, FileText, Eye, EyeOff, Thermometer, Zap, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

export type ResponseMode = "text" | "voice" | "both";
export type TtsProvider = "elevenlabs" | "google" | "openai";

export type VoiceFormality = "formal" | "neutral" | "casual";

export interface AgentSettings {
  model: string;
  responseMode: ResponseMode;
  voiceId: string;
  voiceName: string;
  stability: number;
  speed: number;
  temperature: number;
  assertiveness: number;
  formality: VoiceFormality;
  customInstructions: string;
  ttsProvider: TtsProvider;
  googleTtsApiKey: string;
  openaiTtsApiKey: string;
  googleVoiceName: string;
}

export const DEFAULT_SETTINGS: AgentSettings = {
  model: "google/gemini-2.5-flash",
  responseMode: "both",
  voiceId: "nPczCjzI2devNBz1zQrb",
  voiceName: "Brian",
  stability: 0.5,
  speed: 1.0,
  temperature: 0.7,
  assertiveness: 0.5,
  formality: "neutral",
  customInstructions: "",
  ttsProvider: "elevenlabs",
  googleTtsApiKey: "",
  openaiTtsApiKey: "",
  googleVoiceName: "Kore",
};

const MODELS = [
  { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash (Rápido)", provider: "Google" },
  { value: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro (Avançado)", provider: "Google" },
  { value: "google/gemini-3-flash-preview", label: "Gemini 3 Flash Preview", provider: "Google" },
  { value: "google/gemini-3-pro-preview", label: "Gemini 3 Pro Preview", provider: "Google" },
  { value: "openai/gpt-5-mini", label: "GPT-5 Mini (Equilibrado)", provider: "OpenAI" },
  { value: "openai/gpt-5", label: "GPT-5 (Premium)", provider: "OpenAI" },
  { value: "openai/gpt-5-nano", label: "GPT-5 Nano (Econômico)", provider: "OpenAI" },
];

const RESPONSE_MODES = [
  { value: "both" as ResponseMode, label: "Texto + Voz", icon: MessageSquare },
  { value: "text" as ResponseMode, label: "Somente Texto", icon: MessageSquare },
  { value: "voice" as ResponseMode, label: "Somente Voz", icon: Volume2 },
];

interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category: string;
  preview_url?: string;
}

interface AgentSettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AgentSettings;
  onChange: (s: AgentSettings) => void;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const AgentSettingsPanel = ({ isOpen, onClose, settings, onChange }: AgentSettingsPanelProps) => {
  const [voices, setVoices] = useState<ElevenLabsVoice[]>([]);
  const [loadingVoices, setLoadingVoices] = useState(false);
  const [previewingVoice, setPreviewingVoice] = useState<string | null>(null);
  const [previewAudio, setPreviewAudio] = useState<HTMLAudioElement | null>(null);
  const [showGoogleKey, setShowGoogleKey] = useState(false);
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);

  const TTS_PROVIDERS = [
    { value: "elevenlabs" as TtsProvider, label: "ElevenLabs" },
    { value: "google" as TtsProvider, label: "Google AI Studio TTS" },
    { value: "openai" as TtsProvider, label: "OpenAI TTS" },
  ];

  useEffect(() => {
    if (isOpen && voices.length === 0) fetchVoices();
  }, [isOpen]);

  const fetchVoices = async () => {
    setLoadingVoices(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/elevenlabs-voices`, {
        headers: {
          Authorization: `Bearer ${SUPABASE_KEY}`,
          "Content-Type": "application/json",
        },
      });
      const data = await res.json();
      if (data.voices) setVoices(data.voices);
    } catch (e) {
      console.error("Error fetching voices:", e);
    } finally {
      setLoadingVoices(false);
    }
  };

  const previewVoice = async (voice: ElevenLabsVoice) => {
    if (previewAudio) {
      previewAudio.pause();
      previewAudio.src = "";
    }
    if (previewingVoice === voice.voice_id) {
      setPreviewingVoice(null);
      return;
    }
    if (voice.preview_url) {
      setPreviewingVoice(voice.voice_id);
      const audio = new Audio(voice.preview_url);
      setPreviewAudio(audio);
      audio.play();
      audio.onended = () => setPreviewingVoice(null);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, x: 320 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 320 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-96 bg-background border-l border-border z-50 flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary" />
                <h2 className="font-bold font-display text-foreground">Configurações do Agente</h2>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Model Selection */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-primary" />
                  <Label className="text-sm font-semibold text-foreground">Modelo de IA</Label>
                </div>
                <Select value={settings.model} onValueChange={(v) => onChange({ ...settings, model: v })}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">Google</div>
                    {MODELS.filter(m => m.provider === "Google").map(m => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                    <div className="px-2 py-1 text-xs font-semibold text-muted-foreground mt-1">OpenAI</div>
                    {MODELS.filter(m => m.provider === "OpenAI").map(m => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Custom Instructions */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  <Label className="text-sm font-semibold text-foreground">Instrução Adicional</Label>
                </div>
                <Textarea
                  value={settings.customInstructions}
                  onChange={(e) => onChange({ ...settings, customInstructions: e.target.value })}
                  placeholder="Ex: Sempre responda de forma resumida e com bullet points..."
                  className="min-h-[80px] text-xs resize-none"
                  maxLength={5000}
                />
                <p className="text-[10px] text-muted-foreground">{settings.customInstructions.length}/5000 caracteres</p>
              </div>

              {/* Temperature */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Thermometer className="w-4 h-4 text-primary" />
                  <Label className="text-sm font-semibold text-foreground">
                    Temperatura: <span className="text-primary">{(settings.temperature ?? 0.7).toFixed(1)}</span>
                  </Label>
                </div>
                <Slider
                  min={0} max={1} step={0.1}
                  value={[settings.temperature ?? 0.7]}
                  onValueChange={([v]) => onChange({ ...settings, temperature: v })}
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>Preciso / Focado</span>
                  <span>Criativo / Variado</span>
                </div>
              </div>

              {/* Assertiveness */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" />
                  <Label className="text-sm font-semibold text-foreground">
                    Assertividade: <span className="text-primary">{Math.round((settings.assertiveness ?? 0.5) * 100)}%</span>
                  </Label>
                </div>
                <Slider
                  min={0} max={1} step={0.05}
                  value={[settings.assertiveness ?? 0.5]}
                  onValueChange={([v]) => onChange({ ...settings, assertiveness: v })}
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>Sugestivo / Cauteloso</span>
                  <span>Direto / Decisivo</span>
                </div>
              </div>

              {/* Formality */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-primary" />
                  <Label className="text-sm font-semibold text-foreground">Formalidade da Voz</Label>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { value: "formal" as VoiceFormality, label: "Formal" },
                    { value: "neutral" as VoiceFormality, label: "Neutro" },
                    { value: "casual" as VoiceFormality, label: "Casual" },
                  ]).map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => onChange({ ...settings, formality: opt.value })}
                      className={`p-2.5 rounded-xl border text-xs font-medium transition-all ${
                        settings.formality === opt.value
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-muted/40 text-muted-foreground hover:border-primary/50"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Response Mode */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-foreground">Modo de Resposta</Label>
                <div className="grid grid-cols-3 gap-2">
                  {RESPONSE_MODES.map((mode) => {
                    const Icon = mode.icon;
                    return (
                      <button
                        key={mode.value}
                        onClick={() => onChange({ ...settings, responseMode: mode.value })}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-medium transition-all ${
                          settings.responseMode === mode.value
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-muted/40 text-muted-foreground hover:border-primary/50"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {mode.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* TTS Provider & API Keys */}
              {settings.responseMode !== "text" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-primary" />
                    <Label className="text-sm font-semibold text-foreground">Provedor de Voz (TTS)</Label>
                  </div>
                  <Select value={settings.ttsProvider} onValueChange={(v) => onChange({ ...settings, ttsProvider: v as TtsProvider })}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TTS_PROVIDERS.map(p => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {settings.ttsProvider === "google" && (
                    <>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Voz do Google AI Studio</Label>
                        <Select value={settings.googleVoiceName} onValueChange={(v) => onChange({ ...settings, googleVoiceName: v })}>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[
                              { name: "Kore", gender: "♀" },
                              { name: "Aoede", gender: "♀" },
                              { name: "Leda", gender: "♀" },
                              { name: "Puck", gender: "♂" },
                              { name: "Charon", gender: "♂" },
                              { name: "Fenrir", gender: "♂" },
                              { name: "Orus", gender: "♂" },
                              { name: "Zephyr", gender: "♂" },
                              { name: "Enceladus", gender: "♂" },
                              { name: "Iapetus", gender: "♂" },
                              { name: "Umbriel", gender: "♂" },
                              { name: "Tethys", gender: "♂" },
                              { name: "Proteus", gender: "♂" },
                              { name: "Narvi", gender: "♂" },
                            ].map(v => (
                              <SelectItem key={v.name} value={v.name}>{v.gender} {v.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Chave de API do Google AI Studio</Label>
                      <div className="relative">
                        <Input
                          type={showGoogleKey ? "text" : "password"}
                          value={settings.googleTtsApiKey}
                          onChange={(e) => onChange({ ...settings, googleTtsApiKey: e.target.value })}
                          placeholder="AIza..."
                          className="text-xs pr-9"
                        />
                        <button
                          type="button"
                          onClick={() => setShowGoogleKey(!showGoogleKey)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                        >
                          {showGoogleKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      </div>
                    </>
                  )}

                  {settings.ttsProvider === "openai" && (
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Chave de API da OpenAI</Label>
                      <div className="relative">
                        <Input
                          type={showOpenaiKey ? "text" : "password"}
                          value={settings.openaiTtsApiKey}
                          onChange={(e) => onChange({ ...settings, openaiTtsApiKey: e.target.value })}
                          placeholder="sk-..."
                          className="text-xs pr-9"
                        />
                        <button
                          type="button"
                          onClick={() => setShowOpenaiKey(!showOpenaiKey)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                        >
                          {showOpenaiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Voice Settings (ElevenLabs only) */}
              {settings.responseMode !== "text" && settings.ttsProvider === "elevenlabs" && (
                <>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Volume2 className="w-4 h-4 text-primary" />
                      <Label className="text-sm font-semibold text-foreground">Voz do Agente</Label>
                      {loadingVoices && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
                    </div>

                    {voices.length > 0 ? (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {voices.map((v) => (
                          <div
                            key={v.voice_id}
                            onClick={() => onChange({ ...settings, voiceId: v.voice_id, voiceName: v.name })}
                            className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-all ${
                              settings.voiceId === v.voice_id
                                ? "border-primary bg-primary/10"
                                : "border-border hover:border-primary/50 hover:bg-muted/40"
                            }`}
                          >
                            <div>
                              <p className={`text-xs font-medium ${settings.voiceId === v.voice_id ? "text-primary" : "text-foreground"}`}>
                                {v.name}
                              </p>
                              <p className="text-[10px] text-muted-foreground capitalize">{v.category || "premade"}</p>
                            </div>
                            {v.preview_url && (
                              <button
                                onClick={(e) => { e.stopPropagation(); previewVoice(v); }}
                                className="p-1.5 rounded-md hover:bg-primary/20 transition-colors"
                              >
                                {previewingVoice === v.voice_id
                                  ? <Square className="w-3 h-3 text-primary" />
                                  : <Play className="w-3 h-3 text-muted-foreground" />
                                }
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : !loadingVoices ? (
                      <p className="text-xs text-muted-foreground">Nenhuma voz carregada</p>
                    ) : null}
                  </div>

                  {/* Stability */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-foreground">
                      Estabilidade da Voz: <span className="text-primary">{Math.round(settings.stability * 100)}%</span>
                    </Label>
                    <Slider
                      min={0} max={1} step={0.05}
                      value={[settings.stability]}
                      onValueChange={([v]) => onChange({ ...settings, stability: v })}
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>Mais expressivo</span>
                      <span>Mais consistente</span>
                    </div>
                  </div>

                  {/* Speed */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-foreground">
                      Velocidade: <span className="text-primary">{settings.speed.toFixed(1)}x</span>
                    </Label>
                    <Slider
                      min={0.7} max={1.2} step={0.05}
                      value={[settings.speed]}
                      onValueChange={([v]) => onChange({ ...settings, speed: v })}
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>Mais lento</span>
                      <span>Mais rápido</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="p-4 border-t border-border shrink-0">
              <Button onClick={onClose} className="w-full gradient-primary text-primary-foreground border-0">
                Salvar Configurações
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
