# Bitduli App

Bitduli는 React 프런트엔드와 Firebase를 사용하는 일기 애플리케이션이다.

`codex/server-refactor` 브랜치는 `main`의 화면과 외부 API 계약은 유지하면서, 서버를 Firebase Functions 하나로 정리하고 안정성 검사와 테스트를 추가한 브랜치이다.

## 전체 호출 흐름

```text
사용자
  → React 화면(src/)
  → src/lib/backend.ts
  → Firebase callable Functions(functions/)
  → Firestore 또는 Gemini AI
  → React 화면에 결과 반환
```

- 루트 `src/`는 브라우저에서 실행되는 화면 코드이다.
- `functions/src/`는 Firebase 서버에서 실행되는 인증, 검증, AI, 친구 기능 코드이다.
- 두 폴더는 이름만 같을 뿐 서로 다른 프로그램의 소스 폴더이다.

## `main` 대비 서버 변경사항

### 1. 사용하지 않는 Express 서버 제거

- `main`에는 Firebase Functions와 별도로 `server.ts` Express 서버가 있었다.
- 프런트 전체를 검색한 결과 `/api/generate-drawing`, `/api/summarize-diary` 경로는 사용되지 않았고, 실제 요청은 `src/lib/backend.ts`에서 Firebase callable Functions로 전달되고 있었다.
- 중복된 서버와 AI 처리 경로를 없애기 위해 `server.ts`를 삭제하였다.
- Express 서버에만 필요했던 `express`, `dotenv`, `tsx`, `@types/express` 등의 직접 의존성을 정리하였다.
- 루트 `dev`, `build`, `start` 명령은 Vite 프런트 실행 방식에 맞게 변경하였다.

### 2. 하나였던 Functions 파일을 역할별로 분리

`main`에서는 설정, 입력 검증, AI 처리, fallback 이미지, 친구 기능, Firestore 처리가 대부분 `functions/index.js` 한 파일에 섞여 있었다.

현재 구조는 다음과 같다.

```text
functions/
├─ index.js                 # 외부에 공개할 callable 함수만 export
├─ package.json
├─ scripts/
│  └─ checkSyntax.js        # Functions JavaScript 문법 검사
├─ src/
│  ├─ config.js             # Firebase Admin, 리전, Firestore, Secret 설정
│  ├─ validation.js         # 이메일, 일기, 감정, 색상값 검증
│  ├─ aiService.js          # Gemini 요약·이미지 생성 요청
│  ├─ fallbackDrawing.js    # AI 실패 시 기본 요약·SVG 생성
│  ├─ diaryFunctions.js     # 일기 요약·그림 callable 처리
│  └─ friendFunctions.js    # 친구 요청·수락·거절·삭제 처리
└─ test/
   ├─ validation.test.js
   ├─ diaryFunctions.test.js
   └─ friendFunctions.emulator.test.js
```

`functions/index.js`는 다음 여섯 callable 함수만 다시 export한다.

- `summarizeDiary`
- `generateDiaryDrawing`
- `sendFriendRequest`
- `acceptFriendRequest`
- `declineFriendRequest`
- `removeFriend`

### 3. 친구 데이터 정합성 보완

- 친구 관계는 두 사용자의 Firestore 문서에 각각 기록되므로 한쪽만 변경되면 데이터가 불일치할 수 있다.
- 요청, 수락, 거절, 삭제 시 두 사용자 관계를 확인하고 한 트랜잭션에서 함께 변경하도록 보완하였다.
- 중복 요청, 반대 방향 요청, 잘못된 관계 상태를 차단한다.
- 처리에 실패하면 일부 문서만 저장되거나 삭제되지 않는다.

### 4. 서버 입력값 검증 강화

- 기존 이메일과 일기 본문 검증을 유지하였다.
- 감정값은 `Happy`, `Excited`, `Sad`, `Angry`, `Tired`, `Calm`만 허용한다.
- 감정값이 없으면 `Happy`를 사용한다.
- 프로필 색상은 `#RRGGBB` 형식만 허용하며, 값이 없으면 `#FFF275`를 사용한다.
- 잘못된 입력은 Firebase `invalid-argument` 오류로 반환한다.

### 5. AI 부가 기록 실패가 사용자 결과에 영향을 주지 않도록 변경

- Gemini 결과 생성 후 `aiUsage` 기록을 저장한다.
- 사용 기록 저장에 실패하더라도 이미 생성된 요약이나 그림은 정상적으로 반환한다.
- 실패 로그에는 이메일, 일기 내용, API 키와 같은 민감한 정보를 남기지 않는다.
- Gemini 호출 자체가 실패하면 기존 형식의 fallback 결과를 반환한다.

### 6. 자동 테스트와 문법 검사 추가

- 입력값, 인증, AI 성공·실패, fallback, 응답 구조를 확인하는 단위 테스트를 추가하였다.
- Firestore Emulator에서 친구 관계의 양방향 변경과 실패 시 원자성을 확인하는 통합 테스트를 추가하였다.
- Functions 내부 JavaScript 파일을 재귀적으로 확인하는 문법 검사 스크립트를 추가하였다.
- 현재 작성된 테스트는 실제 Gemini API나 운영 Firestore에 접근하지 않는다.

## 변경하지 않은 외부 계약

- Firebase Functions 리전: `asia-northeast3`
- Secret 이름: `GEMINI_API_KEY`
- 여섯 callable 함수 이름
- 프런트에서 사용하는 주요 요청값과 응답값
- 인증되지 않은 요청 차단
- AI 실패 시 fallback 반환
- 그림 생성 timeout 120초 및 memory 1GiB
- 기존 주요 Firebase 오류 코드

이번 브랜치에서는 프런트 화면, CSS, `src/lib/backend.ts`의 API 형식, Firestore 보안 규칙, Storage 보안 규칙을 변경하지 않았다.

## 주요 파일 변경 목록

| 구분 | 파일 | 내용 |
| --- | --- | --- |
| 삭제 | `server.ts` | 사용되지 않는 Express `/api/*` 서버 제거 |
| 수정 | `functions/index.js` | 구현을 제거하고 callable export 진입점으로 단순화 |
| 추가 | `functions/src/*.js` | 설정·검증·AI·fallback·일기·친구 기능 분리 |
| 추가 | `functions/test/*.test.js` | 단위 테스트 및 Firestore Emulator 테스트 |
| 추가 | `functions/scripts/checkSyntax.js` | Functions 문법 검사 |
| 수정 | `package.json`, `package-lock.json` | Express 의존성 제거 및 Vite 실행 명령 정리 |
| 수정 | `functions/package.json`, `functions/package-lock.json` | 검사·테스트·Emulator 실행 환경 추가 |
| 수정 | `firebase.json` | 로컬 Firestore Emulator 설정 추가 |
| 추가 | `SERVER_STRUCTURE.md` | callable 계약, 설정, 담당 경계, 배포 전 점검 문서 |

## 로컬 실행 및 검사

프로젝트 루트에서 실행한다.

```powershell
npm ci
npm run lint
npm run build

npm --prefix functions ci
npm --prefix functions run lint
npm --prefix functions test
npm --prefix functions run test:emulator
```

- `npm run dev`: React 개발 서버 실행
- `npm start`: 프런트 빌드 결과 미리보기
- Emulator 테스트에는 OpenJDK 21이 필요하다.
- API 키는 코드나 프런트 `.env`에 넣지 않고 Firebase Functions Secret으로 관리한다.

## 아직 남은 작업

- 생성 이미지를 Firebase Storage에 저장하는 구조로 이전
- 프런트 친구 기능의 직접 Firestore 쓰기를 callable Functions 호출로 교체
- 직접 Firestore 접근 이전 후 보안 규칙 재검토
- Firebase App Check 적용
- 사용자별 AI 호출 할당량 적용

세부 callable 요청·응답, Secret 설정, 담당자 작업 경계와 배포 점검 항목은 [SERVER_STRUCTURE.md](./SERVER_STRUCTURE.md)에서 확인할 수 있다.

> 이 브랜치의 코드는 GitHub에 push되어 있지만 Firebase 운영 환경에는 자동 배포되지 않는다.
