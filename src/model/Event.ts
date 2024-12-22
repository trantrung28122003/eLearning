import { TrainingPart, TrainingPartProgressResponses } from "./Course";

export interface EventSlim {
  id: string;
  courseEventName: string;
  startTime: string;
  endTime: string;
  location: string;
  totalPartsByCourseEvent: number;
  completedPartsByCourseEvent : number;
  trainingParts: TrainingPart[];
  trainingPartProgressResponses: TrainingPartProgressResponses[];
}
