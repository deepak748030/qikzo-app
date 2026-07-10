import { create } from 'zustand';
import {
    CompletedJob, IncomingJob, JobStage, JOB_STAGES,
    completedJobs as seedCompleted, incomingJobs,
} from './mockData';

// Rider-side booking flow: online toggle, one active job at a time,
// stage progression, and a running history of completed jobs.
export type ActiveJob = Omit<IncomingJob, 'expiresInSec'> & { stage: JobStage };

type State = {
    online: boolean;
    active: ActiveJob | null;
    completed: CompletedJob[];
    setOnline: (v: boolean) => void;
    acceptJob: (job: IncomingJob) => void;
    advanceStage: () => void;   // moves to next stage; completes on final
    cancelActive: (reason: string) => void;
};

export const useJobs = create<State>((set, get) => ({
    online: false,
    active: null,
    completed: seedCompleted,

    setOnline: (v) => set({ online: v }),

    acceptJob: (job) => {
        const { expiresInSec, ...rest } = job;
        set({ active: { ...rest, stage: 'Heading to pickup' } });
    },

    advanceStage: () => {
        const a = get().active;
        if (!a) return;
        const i = JOB_STAGES.indexOf(a.stage);
        if (i < JOB_STAGES.length - 1) {
            set({ active: { ...a, stage: JOB_STAGES[i + 1] } });
        } else {
            // Delivered → move into completed history.
            const done: CompletedJob = {
                id: a.id,
                category: a.category,
                pickup: a.pickup,
                drop: a.drop,
                distanceKm: a.distanceKm,
                fare: a.fare,
                payment: a.payment,
                completedAt: Date.now(),
            };
            set((s) => ({ active: null, completed: [done, ...s.completed] }));
        }
    },

    cancelActive: (_reason) => set({ active: null }),
}));

// Pick a random pending job for the dispatch screen's incoming card.
let cursor = 0;
export function nextIncoming(): IncomingJob {
    const job = incomingJobs[cursor % incomingJobs.length];
    cursor += 1;
    return job;
}
