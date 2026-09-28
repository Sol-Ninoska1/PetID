import { Composition, Still } from 'remotion';
import { MarketCollar, MarketCover, MarketProfile, MarketScan, MarketSteps, SPIN_FRAMES, TagSpin } from './marketing';
import { FPS, HEIGHT, WIDTH } from './theme';
import { Tutorial, TUTORIAL_FRAMES } from './Tutorial';
import { WHATSAPP_FRAMES, WhatsAppStatus } from './whatsapp';

export function Root() {
  return (
    <>
      <Composition id="PetIDTutorial" component={Tutorial} durationInFrames={TUTORIAL_FRAMES} fps={FPS} width={WIDTH} height={HEIGHT} />
      <Composition id="WhatsAppStatus" component={WhatsAppStatus} durationInFrames={WHATSAPP_FRAMES} fps={FPS} width={WIDTH} height={HEIGHT} />
      <Composition id="TagSpin" component={TagSpin} durationInFrames={SPIN_FRAMES} fps={FPS} width={1080} height={1080} />
      <Still id="MarketCover" component={MarketCover} width={1080} height={1080} />
      <Still id="MarketSteps" component={MarketSteps} width={1080} height={1080} />
      <Still id="MarketCollar" component={MarketCollar} width={1080} height={1080} />
      <Still id="MarketProfile" component={MarketProfile} width={1080} height={1080} />
      <Still id="MarketScan" component={MarketScan} width={1080} height={1080} />
    </>
  );
}
