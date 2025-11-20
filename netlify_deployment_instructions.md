All code modifications and cleanup for Netlify deployment are now complete.

Please follow these instructions to deploy your application to Netlify:

### Netlify에 배포하는 방법

이 과정을 통해 서버 없이도 웹사이트를 호스팅하고 서버리스 함수를 사용할 수 있습니다.

1.  **Git 저장소 초기화 및 변경 사항 커밋**:
    *   아직 Git 저장소가 초기화되지 않았다면, 프로젝트 루트에서 `git init`을 실행합니다.
    *   `git add .`
    *   `git commit -m "feat: Prepare for Netlify deployment with serverless functions"`

2.  **GitHub 저장소 생성 및 코드 푸시**:
    *   GitHub.com으로 이동하여 새 저장소(Repository)를 생성합니다. (비어있는 저장소로 만듭니다.)
    *   로컬 저장소를 GitHub에 연결하고 코드를 푸시합니다.
        ```bash
        git remote add origin [GitHub 저장소 URL]
        git branch -M main
        git push -u origin main
        ```

3.  **Netlify에 연결 및 배포**:
    *   Netlify.com으로 이동하여 로그인합니다 (계정이 없다면 무료로 가입합니다).
    *   "Add new site" -> "Import an existing project" -> "Deploy with GitHub"를 클릭합니다.
    *   Netlify가 GitHub 계정에 접근하도록 승인합니다.
    *   방금 코드를 푸시한 GitHub 저장소를 선택합니다.
    *   **Build settings (빌드 설정)**: Netlify가 `netlify.toml` 파일에서 빌드 명령(`npm run build`)과 배포 디렉토리(`dist`)를 자동으로 감지할 것입니다. 이 설정이 올바른지 확인합니다.

4.  **환경 변수 설정 (매우 중요!)**:
    *   Netlify 사이트 설정 페이지로 이동합니다. (Site settings -> Build & deploy -> Environment)
    *   다음 환경 변수들을 추가합니다.
        *   `GPT40_API_KEY`: 당신의 OpenAI API 키
        *   `GOOGLE_CLIENT_ID`: 당신의 Google OAuth 클라이언트 ID
        *   `GOOGLE_CLIENT_SECRET`: 당신의 Google OAuth 클라이언트 시크릿
        *   `GOOGLE_REDIRECT_URI`: **이 값은 Google Cloud Console과 Netlify 모두에서 업데이트해야 합니다.** 초기 배포 후 Netlify가 사이트 URL을 제공하면, `https://YOUR_NETLIFY_SITE_NAME.netlify.app/.netlify/functions/google-drive-auth-callback` 형식으로 업데이트해야 합니다.
        *   `NETLIFY_SITE_URL`: Netlify가 자동으로 설정해주는 변수이지만, Google OAuth 콜백에 사용되므로 참고하세요. (예: `https://YOUR_NETLIFY_SITE_NAME.netlify.app`)

5.  **사이트 배포**: "Deploy site" 버튼을 클릭합니다. Netlify가 코드를 빌드하고 배포를 시작합니다.

6.  **Google Cloud Console 업데이트 (필수!)**:
    *   첫 배포가 완료되면 Netlify는 당신의 사이트에 고유한 URL(예: `https://random-name-12345.netlify.app`)을 부여합니다.
    *   Google Cloud Console로 이동하여 당신의 OAuth 2.0 클라이언트 ID를 찾습니다.
    *   **"승인된 리디렉션 URI(Authorized redirect URIs)"** 목록에 Netlify가 부여한 URL을 포함한 다음 주소를 **반드시 추가**해야 합니다.
        `https://YOUR_NETLIFY_SITE_NAME.netlify.app/.netlify/functions/google-drive-auth-callback`
    *   이후 Netlify에서 사이트를 다시 배포(Redeploy)하면 모든 설정이 적용됩니다.
