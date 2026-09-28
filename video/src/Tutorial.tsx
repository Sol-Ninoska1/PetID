import { linearTiming, springTiming, TransitionSeries, type TransitionPresentation } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import type { ComponentType } from 'react';
import { AccountScene, ActivateScene, CoverScene, DataScene, HealthScene, PhotoScene } from './activation';
import { AndroidInstallScene, InstallScene, NotifyScene } from './install';
import { AlertScene, CollarScene, HookScene, LostScanScene, OutroScene, ProfileScene, ScanScene } from './scenes';

type Presentation = TransitionPresentation<Record<string, unknown>>;

const fadeIn = fade() as Presentation;
const slideIn = slide({ direction: 'from-right' }) as Presentation;

/** `enter` is the transition used to reach this scene from the previous one. */
const scenes: { id: string; frames: number; Scene: ComponentType; enter?: Presentation }[] = [
  { id: 'hook', frames: 100, Scene: HookScene },
  { id: 'collar', frames: 180, Scene: CollarScene, enter: fadeIn },
  { id: 'scan', frames: 170, Scene: ScanScene, enter: fadeIn },
  { id: 'account', frames: 240, Scene: AccountScene, enter: fadeIn },
  { id: 'photo', frames: 215, Scene: PhotoScene, enter: slideIn },
  { id: 'cover', frames: 200, Scene: CoverScene, enter: fadeIn },
  { id: 'data', frames: 290, Scene: DataScene, enter: fadeIn },
  { id: 'health', frames: 260, Scene: HealthScene, enter: fadeIn },
  { id: 'activate', frames: 190, Scene: ActivateScene, enter: fadeIn },
  { id: 'install', frames: 280, Scene: InstallScene, enter: slideIn },
  { id: 'android', frames: 250, Scene: AndroidInstallScene, enter: slideIn },
  { id: 'notify', frames: 240, Scene: NotifyScene, enter: fadeIn },
  { id: 'lost-scan', frames: 170, Scene: LostScanScene, enter: slideIn },
  { id: 'profile', frames: 230, Scene: ProfileScene, enter: fadeIn },
  { id: 'alert', frames: 230, Scene: AlertScene, enter: slideIn },
  { id: 'outro', frames: 150, Scene: OutroScene, enter: fadeIn },
];

const TRANSITION = 16;

export const TUTORIAL_FRAMES = scenes.reduce((sum, s) => sum + s.frames, 0) - TRANSITION * (scenes.length - 1);

export function Tutorial() {
  return (
    <TransitionSeries>
      {scenes.flatMap(({ id, frames, Scene, enter }) => [
        ...(enter
          ? [
              <TransitionSeries.Transition
                key={`${id}-in`}
                presentation={enter}
                timing={enter === slideIn ? springTiming({ config: { damping: 200 }, durationInFrames: TRANSITION }) : linearTiming({ durationInFrames: TRANSITION })}
              />,
            ]
          : []),
        <TransitionSeries.Sequence key={id} durationInFrames={frames}>
          <Scene />
        </TransitionSeries.Sequence>,
      ])}
    </TransitionSeries>
  );
}
