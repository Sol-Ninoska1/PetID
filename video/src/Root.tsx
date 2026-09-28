import { Composition } from 'remotion';
import { FPS, HEIGHT, WIDTH } from './theme';
import { Tutorial, TUTORIAL_FRAMES } from './Tutorial';

export function Root() {
  return (
    <Composition id="PetIDTutorial" component={Tutorial} durationInFrames={TUTORIAL_FRAMES} fps={FPS} width={WIDTH} height={HEIGHT} />
  );
}
