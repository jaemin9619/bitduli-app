# Bitduli 서버 구조

## 운영 호출 흐름

```text
React 화면
  → src/lib/backend.ts의 httpsCallable 래퍼
  → Firebase Functions v2 callable (asia-northeast3)
  → Firestore Admin SDK 또는 Gemini/Imagen
  → callable 응답
```

운영 서버는 Firebase Functions 하나이다. 과거 Express `/api/*` 서버는 프런트에서 사용하지 않아 제거했으며, AI 처리는 `functions/`에만 둔다.

## Functions 파일 역할

```text
functions/
├─ index.js                 # 배포할 callable 이름만 다시 export
├─ package.json
└─ src/
   ├─ config.js             # Admin 초기화, 리전/인스턴스, Firestore, Secret
   ├─ validation.js         # 인증 이메일, 대상 이메일, 일기 본문 검증
   ├─ aiService.js          # Gemini 요약·장면 추출·Imagen 호출
   ├─ fallbackDrawing.js    # AI 미설정/실패 시 요약·SVG fallback
   ├─ diaryFunctions.js     # 일기 요약·그림 callable과 사용 기록
   └─ friendFunctions.js    # 친구 요청·수락·거절·삭제 callable
```

`config.js`에서 Firebase Admin을 한 번만 초기화한다. 나머지 모듈은 이 인스턴스를 공유하며 서로를 역참조하지 않는다.

## Callable API 계약

모든 함수는 Firebase Auth 사용자의 이메일이 있어야 하며, 없으면 `unauthenticated` 오류를 반환한다.

| 함수 | 요청 `data` | 성공 응답 | 주요 검증·오류 |
| --- | --- | --- | --- |
| `summarizeDiary` | `diaryText: string`, `feeling` | `{ summary, isMock }` | 본문 2자 이상, 최대 4,000자 |
| `generateDiaryDrawing` | `diaryText: string`, `profileColorHex`, `profileColorName`, `feeling` | AI 성공 시 `{ imageBase64, mimeType, isMock: false }`, fallback 시 `{ imageDataUrl, isMock: true }` | 본문 2자 이상, 최대 4,000자; timeout 120초, memory 1GiB |
| `sendFriendRequest` | `targetEmail: string` | `{ ok: true, friendNickname }` | `invalid-argument`, `failed-precondition`, `not-found`, `already-exists` |
| `acceptFriendRequest` | `targetEmail: string` | `{ ok: true }` | `invalid-argument`, `not-found`, `failed-precondition` |
| `declineFriendRequest` | `targetEmail: string` | `{ ok: true }` | 이메일 형식 검증 |
| `removeFriend` | `targetEmail: string` | `{ ok: true }` | 이메일 형식 검증 |

AI 키가 없거나 AI 생성이 실패하면 일기 함수는 기존 응답 형태의 로컬 fallback을 반환한다. 친구 요청과 수락은 양쪽 사용자 문서를 Firestore 트랜잭션으로 함께 변경한다.

## Secret과 환경 설정

- 운영 Secret 이름은 `GEMINI_API_KEY`이며 함수 옵션의 `secrets`로 요약·그림 함수에만 연결한다.
- 값 설정: `npx firebase-tools functions:secrets:set GEMINI_API_KEY`
- 로컬 에뮬레이터에서는 Git에 포함되지 않는 `functions/.secret.local`을 사용하거나 실행 환경에 `GEMINI_API_KEY`를 주입한다.
- `.env*`는 `.env.example`을 제외하고 Git에서 무시한다. 실제 키를 프런트 코드, 문서, 커밋에 넣지 않는다.

## 로컬 검사와 빌드

프로젝트 루트(`final/bitduli-app`)에서 실행한다.

```powershell
npm ci
npm run lint
npm run build
npm --prefix functions ci
npm --prefix functions run lint
```

개발 화면은 `npm run dev`, 빌드 결과 미리보기는 `npm start`를 사용한다. Functions 배포는 별도 검토 후 Firebase CLI로 수행하며 이 저장소 작업만으로 자동 배포되지 않는다.

## 수정 규칙과 담당 경계

- 서버 담당자는 `functions/index.js`의 공개 export 이름과 `src/lib/backend.ts`의 요청·응답 계약을 함께 확인한다.
- 새 callable 구현은 `functions/src/`의 해당 책임 모듈에 두고 `index.js`에는 export만 추가한다.
- Firebase Admin 초기화, 리전, Secret 선언은 `config.js`에서만 관리한다.
- 사용자 입력은 `validation.js`를 거치고, 인증·오류 코드·fallback·트랜잭션 동작을 변경하면 프런트 담당자와 먼저 계약을 합의한다.
- 프런트 담당자는 React 화면, 상태, 로딩/오류 표시와 `src/lib/backend.ts` 연결을 맡는다. 서버 구현이나 Secret을 프런트로 복제하지 않는다.
- Firestore 규칙은 프런트의 직접 접근이 남아 있으므로 callable 이전과 규칙 변경을 같은 변경으로 검증한다.

## 프런트에 남은 직접 Firestore 접근

- `src/App.tsx`: 사용자 프로필 조회·생성·갱신.
- `src/components/CalendarDashboard.tsx`: 본인 일기 조회·저장·삭제, 친구 목록 구독, 친구 공개 일기 조회, 친구 관계 직접 쓰기·삭제, 프로필 수정과 계정 데이터 정리.
- 특히 친구 추가·수락·거절·삭제 UI는 현재 `src/lib/backend.ts`에 준비된 친구 callable 래퍼 대신 직접 Firestore를 변경한다. 향후 화면 동작별로 callable 래퍼로 교체한 뒤 양쪽 문서 접근을 막는 보안 규칙을 별도 검증해야 한다.

## 배포 전 확인

- 여섯 callable export와 `asia-northeast3` 리전을 확인한다.
- `GEMINI_API_KEY` Secret의 프로젝트 등록·권한·함수 연결을 확인한다.
- 인증 없음, 잘못된 이메일·일기, AI 실패, 중복 친구 요청, 수락 조건 실패를 에뮬레이터에서 확인한다.
- 친구 요청·수락의 양방향 문서와 트랜잭션 결과를 확인한다.
- 프런트 빌드와 Functions lint를 통과시키고 Firebase 프로젝트 별칭을 확인한다.
- 직접 Firestore 접근과 현재 보안 규칙이 충돌하지 않는지 확인한다.
- 배포 후 Functions 로그, AI 사용 기록, timeout·memory, fallback 비율을 확인한다.
