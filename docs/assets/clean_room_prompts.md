# Clean-Room Asset Generation Guide

*Reference: `prd.md` Section 4 (Legal and Rights Requirements) & Section 18 (Visual Assets)*

이 문서는 저작권 문제가 없는 '클린룸 모드' 구현을 위해 직접 생성해야 하는 에셋의 목록과, AI 이미지 생성기 또는 디자이너에게 전달할 프롬프트(Prompt) 및 규격을 정의합니다.

## 1. 기본 아트 디렉션 (Art Direction)
* **스타일:** 8-bit retro NES 픽셀 아트 스타일
* **테마:** 사이파이(Sci-fi), 우주, 차원 이동, 기계적인(Mechanical) 느낌
* **색상 팔레트:** 원색 중심의 고대비 색상 (블랙/네온 블루/메탈릭 그레이 등)
* **주의사항:** 이미지 생성 AI를 사용할 경우 정확한 픽셀 사이즈(예: 16x8)를 한 번에 뽑아내기 어려울 수 있으므로, 고해상도로 "픽셀 아트 스타일"을 생성한 후 포토샵 등에서 모자이크 처리(Downscaling) 및 팔레트 인덱싱을 거쳐야 합니다.

---

## 2. 게임플레이 스프라이트 (Gameplay Sprites)

### 2.1. 패들 (Player Ship)
원작의 'Vaus'를 대체할 플레이어의 우주선/방어막 발생기입니다.
* **규격:** 기본 32x8 px / 확장(Enlarge) 시 48x8 px
* **프롬프트:**
  > "8-bit pixel art of a sleek sci-fi escape pod paddle, horizontal orientation, top-down view, metallic gray and neon blue accents, flat black background, simple geometric shape."

### 2.2. 에너지 볼 (Energy Ball)
원작의 공을 대체합니다.
* **규격:** 4x4 px
* **프롬프트:**
  > "8-bit pixel art of a glowing small energy sphere, pure white center with a faint cyan aura, simple retro arcade style, flat black background."

### 2.3. 브릭 타일셋 (Bricks)
* **규격:** 16x8 px (가로형 직사각형)
* **타입:** 일반(색상별 8종), 실버(다단 히트), 골드(파괴 불가)
* **프롬프트:**
  > "8-bit pixel art sprite sheet of rectangular sci-fi blocks, 16x8 aspect ratio per block. Includes vibrant solid colors (red, blue, green, yellow), a metallic silver block with rivet details, and an indestructible gold block. Flat black background."

### 2.4. 파워업 캡슐 (Capsules)
원작의 알파벳 캡슐을 대체합니다. 기호나 아이콘을 사용해도 좋습니다.
* **규격:** 16x8 px
* **타입:** S(느려짐), C(캐치), L(레이저), D(분열), P(생명 연장), E(확장), B(워프)
* **프롬프트:**
  > "8-bit pixel art sprite sheet of glowing pill-shaped sci-fi capsules. Each capsule has a distinct bright color (orange, yellow, red, light blue, gray, blue, pink) and features a glowing letter or futuristic symbol in the center. Flat black background."

### 2.5. 외계 장애물 (Enemies/Obstacles)
원작의 Konerd, Pyradok 등을 대체합니다.
* **규격:** 16x16 px 또는 24x24 px
* **프롬프트:**
  > "8-bit pixel art of a floating geometric alien drone, mechanical and menacing, symmetrical design, retro arcade enemy style, flat black background."

---

## 3. UI 및 배경 에셋 (UI & Backgrounds)

### 3.1. 타이틀 로고 (Title Logo)
'Arkanoid'를 대체할 새로운 타이틀 명칭(예: "Warp Breaker" 등)의 픽셀 로고.
* **규격:** 가변 (화면 상단에 배치)
* **프롬프트:**
  > "8-bit retro arcade game title logo reading 'WARP BREAKER', metallic chrome text with a neon pink outline, sci-fi futuristic typography, pixel art style, transparent background."

### 3.2. 메인 배경 (Main Background)
* **규격:** 256x240 px (NES 논리 해상도 기준)
* **프롬프트:**
  > "8-bit pixel art background for a retro arcade game, deep space scene with distant glowing stars, a subtle purple and blue nebula, extremely dark and unintrusive palette to allow gameplay elements to pop."

### 3.3. 최종 보스 요새 (Final Boss)
원작의 'DOH'를 대체할 거대한 차원 요새.
* **규격:** 64x64 px 이상
* **프롬프트:**
  > "8-bit pixel art of a giant monolithic alien dimensional fortress boss, intimidating mechanical face, dark and menacing, retro arcade style, symmetrical."
