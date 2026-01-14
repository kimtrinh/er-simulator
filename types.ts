export interface Vitals {
  hr: number;
  bpSystolic: number;
  bpDiastolic: number;
  rr: number;
  o2: number;
  temp: number;
  rhythm: string;
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  type?: 'text' | 'alert' | 'success';
  timestamp: number;
  imageUrl?: string; // For clinical images extracted from PDF
}

export interface CriticalEvent {
  event: string;
  userAction: string;
  optimalAction: string;
  feedback: string;
  type: 'positive' | 'negative' | 'neutral';
}

export interface DebriefData {
  outcome: string;
  score: number; // 0-100
  summary: string;
  performanceBreakdown: {
    historyDataCollection: number; // 0-100
    differentialDiagnosis: number; // 0-100
    medicalManagement: number; // 0-100
    communicationEfficiency: number; // 0-100
  };
  criticalEvents: CriticalEvent[];
  missedOpportunities: string[];
  cmeLearningPoints: string[];
}

export interface ExtractedImage {
  id: string;
  data: string; // base64
  label: string; // e.g. "EKG", "CXR"
}

export interface GameState {
  stage: 'upload' | 'analyzing' | 'playing' | 'debrief';
  vitals: Vitals;
  messages: Message[];
  learningPoints: string[];
  hiddenDiagnosis: string;
  caseContext: string;
  visuals: ExtractedImage[];
  debriefData?: DebriefData;
}

export interface ActionPayload {
  actionType: 'history' | 'exam' | 'labs' | 'imaging' | 'treatment' | 'consult';
  detail: string;
}

export interface SimulationResponse {
  narrative: string;
  updatedVitals: Vitals;
  isCaseOver: boolean;
  imageIdToDisplay?: string; // The ID of the extracted image to show
  debriefData?: DebriefData;
}