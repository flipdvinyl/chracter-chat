class CharacterChat {
    constructor() {
        // API 키는 .env 파일에서 로드됩니다
        // 개발 환경에서는 window.OPENAI_API_KEY를 사용하고, 
        // 프로덕션에서는 환경변수나 다른 방법을 사용하세요
        this.apiKey = window.OPENAI_API_KEY || 'YOUR_OPENAI_API_KEY_HERE';
        this.googleApiKey = window.GOOGLE_API_KEY || 'YOUR_GOOGLE_API_KEY_HERE';
        this.supertoneApiKey = window.SUPERTONE_API_KEY || 'YOUR_SUPERTONE_API_KEY_HERE';
        this.currentCharacter = null;
        this.chatHistory = [];
        this.summary = ""; // 대화 요약 관리
        
        // 캐릭터 정의
        this.characterDefinitions = {
            '1': '쿠마모토현의 대표 캐릭터인 쿠마몬이야.',
            '2': '고객의 말을 일단 무시하고 자기 맘대로 행동하는, 하지만 아슬아슬한선에서 최소한의 예의를 지키는 매우 거친 캐릭터야. 반말과 욕은 아니지만 비속어를 마음껏 사용해도 되. 막말해도 되는데 주제와 흐름은 회사를 대표하는 캐릭터임을 잊지마.',
            '3': '제스프리의 키위 캐릭터',
            '4': '산리오의 쿠루미',
            '5': '' // 커스텀 캐릭터는 사용자가 입력
        };
        
        // TTS 관련 변수들
        this.currentAudio = null;
        this.audioBuffers = new Map(); // 선택지별 오디오 버퍼
        this.ttsIgnoreFlag = false; // TTS 무시 플래그
        this.stopRequested = false; // 재생 중지 요청 플래그
        this.choicesDisplayTimer = null; // 선택지 표시 타이머
        
        // TTS 설정
        this.ttsSettings = {
            voiceId: 'weKbNjMh2V5MuXziwHwjoT', // 기본 voice ID
            speakingRate: 1.4,
            language: 'ko',
            style: 'neutral',
            model: 'sona_speech_1'
        };
        
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        // 캐릭터 선택 버튼들
        document.querySelectorAll('.character-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                console.log('캐릭터 버튼 클릭됨:', e.target.dataset.character);
                const character = e.target.dataset.character;
                this.selectCharacter(character);
            });
        });

        // 뒤로가기 버튼
        document.getElementById('back-btn').addEventListener('click', () => {
            this.showLanding();
        });

        // 커스텀 캐릭터 버튼
        document.getElementById('custom-character-btn').addEventListener('click', () => {
            this.handleCustomCharacter();
        });

        // 키보드 단축키 (1,2,3,4) - 0부터 시작하는 인덱스로 통일
        document.addEventListener('keydown', (e) => {
            if (e.key >= '1' && e.key <= '5') {
                const choiceIndex = parseInt(e.key) - 1; // 1->0, 2->1, 3->2, 4->3, 5->4
                console.log(`키보드 ${e.key} 누름 -> 인덱스 ${choiceIndex}`);
                
                // 5번 키인 경우 기본 동작(텍스트 입력) 방지
                if (e.key === '5') {
                    e.preventDefault();
                    console.log('🚫 5번 키 기본 동작 방지 (텍스트 입력 차단)');
                }
                
                this.handleKeyboardChoice(choiceIndex);
            }
        });
    }

    selectCharacter(characterNumber) {
        console.log('캐릭터 선택됨:', characterNumber);
        this.currentCharacter = characterNumber;
        document.getElementById('character-name').textContent = `캐릭터${characterNumber}`;
        this.showChat();
        this.startChat();
    }

    handleCustomCharacter() {
        const customInput = document.getElementById('custom-character-input');
        const customText = customInput.value.trim();
        
        if (!customText) {
            alert('캐릭터를 설명해주세요!');
            customInput.focus();
            return;
        }
        
        console.log('커스텀 캐릭터 선택됨:', customText);
        
        // 커스텀 캐릭터 정의를 저장
        this.characterDefinitions['5'] = customText;
        this.currentCharacter = '5';
        document.getElementById('character-name').textContent = '나만의 캐릭터';
        this.showChat();
        this.startChat();
    }

    showLanding() {
        // 모든 TTS 중지
        this.stopAllTTS();
        
        document.getElementById('landing').classList.add('active');
        document.getElementById('chat').classList.remove('active');
        this.chatHistory = [];
        this.currentCharacter = null;
    }

    showChat() {
        console.log('챗 화면으로 전환');
        document.getElementById('landing').classList.remove('active');
        document.getElementById('chat').classList.add('active');
        
        // 디버깅: 실제 DOM 상태 확인
        const landing = document.getElementById('landing');
        const chat = document.getElementById('chat');
        console.log('랜딩 화면 active 클래스:', landing.classList.contains('active'));
        console.log('챗 화면 active 클래스:', chat.classList.contains('active'));
        console.log('챗 화면 display 스타일:', window.getComputedStyle(chat).display);
    }

    async startChat() {
        const chatMessages = document.getElementById('chat-messages');
        chatMessages.innerHTML = '';
        
        // TTS 무시 플래그 리셋 (새로운 대화 시작)
        this.stopRequested = false;
        
        this.showLoading(true);
        
        try {
            // 캐릭터 이미지 생성
            const characterDef = this.characterDefinitions[this.currentCharacter] || '쿠마모토현의 대표 캐릭터인 쿠마몬이야.';
            console.log('🎨 캐릭터 이미지 생성 시작...');
            
            // 이미지 생성과 채팅 시작을 병렬로 실행
            const imagePromise = this.generateCharacterImage(characterDef);
            const chatPromise = this.callOpenAI("환영 인사를 해주세요", []);
            
            // 채팅 응답 먼저 처리
            const response = await chatPromise;
            this.showLoading(false);
            this.processResponse(response);
            
            // 이미지 생성 완료 후 배경 설정
            try {
                console.log('⏳ 이미지 생성 완료 대기 중...');
                const imageUrl = await imagePromise;
                console.log('📥 이미지 생성 결과:', imageUrl ? '성공' : '실패');
                
                if (imageUrl) {
                    this.setChatBackground(imageUrl);
                    console.log('✅ 캐릭터 배경 이미지 설정 완료');
                } else {
                    console.log('⚠️ 이미지 생성 실패 - 상세 정보:');
                    console.log('⚠️ - API 키 상태:', this.googleApiKey ? '설정됨' : '설정되지 않음');
                    console.log('⚠️ - 캐릭터 정의:', characterDef);
                    console.log('⚠️ - 기본 배경으로 대체');
                    this.setChatBackground(null);
                }
            } catch (imageError) {
                console.error('❌ 이미지 생성 오류 - 상세 정보:');
                console.error('❌ - 오류 타입:', imageError.constructor.name);
                console.error('❌ - 오류 메시지:', imageError.message);
                console.error('❌ - API 키 상태:', this.googleApiKey ? '설정됨' : '설정되지 않음');
                console.error('❌ - 캐릭터 정의:', characterDef);
                console.error('❌ - 기본 배경으로 대체');
                this.setChatBackground(null);
            }
            
        } catch (error) {
            console.error('API 호출 에러:', error);
            this.showLoading(false);
            this.addMessage('죄송합니다. 오류가 발생했습니다. 다시 시도해주세요.', 'character');
        }
    }

    getPersona() {
        const characterDef = this.characterDefinitions[this.currentCharacter] || '쿠마모토현의 대표 캐릭터인 쿠마몬이야.';
        
        return `너와 캐릭터챗을 할거야. 내가 정해준 캐릭터가 되어 나와 캐릭터챗을 하는것처럼 답변해줘. 1) 내가 질문을 하면 너는 해당 캐릭터가 되서 답변을 하고. 2) 그 답변에 이어지는 내가 했으면 하는 답변도 객관식으로 4개를 제안해줘. 제안하는 텍스트도 마치 내가 너에게 묻는 것처럼 대화체로 출력해야해. 제안 답변 내용만 출력하고 불필요한 텍스트는 출력하지마. 단, 4번째 선택지는 항상 '다른 이야기를 해보고 싶어-'이고 이때는 내가 자유롭게 새로운 주제를 기반으로 답변해줘. 자유롭되 너의 페르소나나 캐릭터 특성에 기반한 제안이면 좋자. 이 질문에 답변할때도 여전히 4가지 선택지를 제안해야해 3) 내가 그 객관식중에 답변 번호를 입력하면 너는 또 거기에 맞는 대화를 계속 이어하는 형태야. 즉, 너와 객관식 답변으로 캐릭터챗을 이어가는거지. 4) 답변과 객관식 추가 답변 텍스트를 제외하고는 어떤 텍스트도 출력하지마.   

이제 너의 캐릭터는 ${characterDef} 그럼 너의 환영 인사부터 챗을 시작해보자.

그럼 너의 환영 인사부터 챗을 시작해보자. 반드시 한국어로 상호 소통해야해.`;
    }

    async callOpenAI(userText, history = []) {
        console.log('API 요청 시작...');
        console.log('사용 모델: gpt-4.1-mini');
        console.log('요청 내용:', userText);
        
        const persona = this.getPersona();
        const messages = [
            { role: "system", content: persona.trim() },
            this.summary ? { role: "system", content: `대화 요약:\n${this.summary}` } : null,
            ...history.slice(-8), // 최근 8턴만
            { role: "user", content: userText }
        ].filter(Boolean);

        console.log('전송할 메시지들:', messages);

        try {
            const res = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${this.apiKey}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: "gpt-4.1-mini",
                    messages,
                    temperature: 0.9,
                    top_p: 0.95,
                    max_tokens: 350
                })
            });

            console.log('API 응답 상태:', res.status);

            if (!res.ok) {
                const err = await res.text();
                console.error('API 에러 응답:', err);
                throw new Error(`API 실패: ${res.status} - ${err}`);
            }

            const data = await res.json();
            console.log('API 응답 데이터:', data);
            
            const reply = data.choices?.[0]?.message?.content ?? "";
            
            // 대화 히스토리에 추가
            this.chatHistory.push({ role: "user", content: userText });
            this.chatHistory.push({ role: "assistant", content: reply });
            
            return reply;
        } catch (error) {
            console.error('API 호출 중 예외 발생:', error);
            throw error;
        }
    }

    processResponse(response) {
        console.log('=== API 응답 원본 ===');
        console.log(response);
        console.log('==================');
        
        // 기존 선택지 표시 타이머 초기화
        if (this.choicesDisplayTimer) {
            clearTimeout(this.choicesDisplayTimer);
            this.choicesDisplayTimer = null;
            console.log('⏰ 새 응답 처리 - 선택지 표시 타이머 초기화');
        }
        
        // 응답을 파싱하여 캐릭터 메시지와 선택지로 분리
        const lines = response.split('\n').filter(line => line.trim());
        console.log('분리된 줄들:', lines);
        console.log('총 줄 개수:', lines.length);
        
        if (lines.length === 0) {
            console.error('API 응답이 비어있습니다!');
            return;
        }
        
        // 첫 번째 줄은 캐릭터의 답변
        const characterMessage = lines[0];
        console.log('캐릭터 메시지:', characterMessage);
        this.addMessage(characterMessage, 'character');

        // 나머지 줄들은 선택지 (최대 4개)
        const choices = lines.slice(1, 5);
        console.log('선택지들:', choices);
        console.log('선택지 개수:', choices.length);
        
        if (choices.length === 0) {
            console.warn('선택지가 없습니다! API가 4개 선택지를 제공하지 않았습니다.');
        }
        
        const choiceTexts = [];
        choices.forEach((choice, index) => {
            if (choice.trim()) {
                // 선택지에서 숫자 제거 (1. 2. 3. 4. 등)
                const cleanChoice = choice.replace(/^\d+\.\s*/, '').trim();
                console.log(`선택지 ${index + 1} 추가:`, cleanChoice);
                this.addMessage(cleanChoice, 'user', index);
                choiceTexts.push(cleanChoice);
            } else {
                console.log(`선택지 ${index + 1} 비어있음`);
            }
        });

        // 선택지들이 화면에 표시된 후 TTS 버퍼링 시작
        if (choiceTexts.length > 0) {
            console.log('🎵 선택지 TTS 버퍼링 시작 (화면 표시 완료 후)');
            setTimeout(() => {
                this.bufferTTS(choiceTexts);
            }, 200); // 모든 선택지가 화면에 표시된 후 실행
        }

        // 5번 선택지 추가 (직접 입력)
        this.addCustomInputChoice();
    }

    addCustomInputChoice() {
        const chatMessages = document.getElementById('chat-messages');
        const inputContainer = document.createElement('div');
        inputContainer.className = 'message user-message custom-input-container';
        // data-choice-number 제거 (숫자 표시 안함)
        
        // 5번 선택지도 처음에 숨김 (TTS 재생 시점에 표시)
        inputContainer.style.visibility = 'hidden';
        console.log('💬 5번 선택지(직접 입력)를 숨김 상태로 표시 (TTS 재생 시점에 표시 예정)');
        
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = '직접 입력하세요';
        input.className = 'custom-input';
        
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && input.value.trim()) {
                const inputText = input.value.trim();
                console.log(`직접 입력: ${inputText}`);
                this.handleChoiceClick(inputText, 4); // 인덱스 4 (5번째)
            }
        });

        // 클릭 시 포커스 설정
        inputContainer.addEventListener('click', () => {
            input.focus();
        });
        
        inputContainer.appendChild(input);
        chatMessages.appendChild(inputContainer);
        
        // 스크롤
        inputContainer.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }

    addMessage(text, type, choiceIndex = null) {
        console.log(`메시지 추가: type=${type}, choiceIndex=${choiceIndex}, text="${text}"`);
        
        const chatMessages = document.getElementById('chat-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}-message`;
        messageDiv.textContent = text;
        
        // 캐릭터 메시지와 선택지들은 처음에 숨김 (TTS 재생 시점에 표시)
        if (type === 'character') {
            messageDiv.style.visibility = 'hidden';
            console.log('💬 캐릭터 메시지를 숨김 상태로 표시 (TTS 재생 시점에 표시 예정)');
        } else if (type === 'user' && choiceIndex !== null) {
            messageDiv.style.visibility = 'hidden';
            console.log(`💬 선택지 ${choiceIndex + 1} 메시지를 숨김 상태로 표시 (TTS 재생 시점에 표시 예정)`);
        }
        
        if (type === 'user' && choiceIndex !== null) {
            console.log('클릭 이벤트 추가됨');
            // 선택지 번호 표시 (1부터 시작하지만 인덱스는 0부터)
            messageDiv.setAttribute('data-choice-number', choiceIndex + 1);
            messageDiv.addEventListener('click', () => {
                this.handleChoiceClick(text, choiceIndex);
            });
        }
        
        chatMessages.appendChild(messageDiv);
        
        // 마우스휠처럼 부드럽게 맨 아래로 스크롤
        messageDiv.scrollIntoView({ behavior: 'smooth', block: 'end' });
        
        // 캐릭터 메시지인 경우 TTS 생성 및 재생
        if (type === 'character') {
            console.log('🎵 캐릭터 메시지 TTS 생성 및 재생 시작');
            // 화면에 표시된 후 TTS 생성 및 재생
            setTimeout(() => {
                this.generateAndPlayTTS(text, true);
            }, 100); // DOM 업데이트 후 실행
        }
        
        console.log('메시지 DOM에 추가 완료');
    }

    handleKeyboardChoice(choiceIndex) {
        // 현재 챗 화면이 활성화되어 있고, 선택지가 있는지 확인
        const chatScreen = document.getElementById('chat');
        if (!chatScreen.classList.contains('active')) {
            return; // 챗 화면이 아니면 무시
        }

        // 현재 표시된 선택지들을 찾기 (custom-input-container 포함)
        const userMessages = document.querySelectorAll('.user-message');
        const allChoices = Array.from(userMessages).filter(msg => 
            !msg.textContent.includes('죄송합니다') // 에러 메시지만 제외
        );

        // 가장 최근 5개 선택지만 현재 대화의 선택지로 간주 (1-4번 + 5번 직접입력)
        const currentChoices = allChoices.slice(-5);
        
        console.log('키보드 선택 - 전체 선택지:', allChoices.map((c, i) => `${i}: ${c.textContent || 'custom-input'}`));
        console.log('키보드 선택 - 현재 선택지:', currentChoices.map((c, i) => `${i}: ${c.textContent || 'custom-input'}`));
        console.log('키보드 선택 - 선택할 인덱스:', choiceIndex);

        if (choiceIndex < currentChoices.length) {
            const selectedChoice = currentChoices[choiceIndex];
            
            // 5번 단축키(인덱스 4)인 경우 직접 입력 텍스트 박스에 포커스
            if (choiceIndex === 4) {
                console.log('⌨️ 5번 단축키 - 직접 입력 텍스트 박스에 포커스');
                const inputElement = selectedChoice.querySelector('.custom-input');
                if (inputElement) {
                    inputElement.focus();
                    console.log('✅ 직접 입력 텍스트 박스에 포커스 설정 완료');
                } else {
                    console.log('❌ 직접 입력 텍스트 박스를 찾을 수 없음');
                }
                return; // 5번은 클릭 이벤트 처리하지 않고 포커스만 설정
            }
            
            const choiceText = selectedChoice.textContent;
            console.log(`키보드 단축키 ${choiceIndex + 1} 선택됨: ${choiceText}`);
            
            // 클릭 이벤트와 동일하게 처리
            this.handleChoiceClick(choiceText, choiceIndex);
        } else {
            console.log(`선택지 ${choiceIndex + 1}이 존재하지 않습니다.`);
        }
    }

    async handleChoiceClick(choiceText, choiceIndex) {
        console.log('=== 선택지 클릭 처리 ===');
        console.log('클릭된 선택지 텍스트:', choiceText);
        console.log('클릭된 선택지 인덱스:', choiceIndex);
        
        // 선택지 선택 시 타이머 초기화
        if (this.choicesDisplayTimer) {
            clearTimeout(this.choicesDisplayTimer);
            this.choicesDisplayTimer = null;
            console.log('⏰ 선택지 선택 - 선택지 표시 타이머 초기화');
        }
        
        // 마지막 선택 인덱스 저장
        this.lastChoiceIndex = choiceIndex;
        
        // 모든 선택지에 selected 클래스 추가 (숫자+원 사라짐, 영역 줄어듬)
        // 단, 직접 입력 선택지(인덱스 4번)는 제외
        const allUserMessages = document.querySelectorAll('.user-message');
        const recentChoices = Array.from(allUserMessages).slice(-5);
        
        recentChoices.forEach((choice, index) => {
            if (index === choiceIndex) {
                // 선택한 선택지: selected 클래스 추가 (숫자+원 사라짐, 영역 줄어듬)
                if (index !== 4) {
                    choice.classList.add('selected');
                }
                
                // 선택한 선택지 고정: 클릭 이벤트 제거 및 텍스트 수정 방지
                choice.style.pointerEvents = 'none'; // 클릭 비활성화
                choice.style.userSelect = 'none'; // 텍스트 선택 방지
                
                // 직접입력의 경우 input 비활성화
                const input = choice.querySelector('.custom-input');
                if (input) {
                    input.disabled = true;
                    input.style.pointerEvents = 'none';
                }
            } else {
                // 나머지 선택지들: 제거 애니메이션 적용
                this.animateRemoval(choice);
            }
        });
        
        // 선택한 선택지 메시지 추가 로직 제거됨
        
        // 선택한 선택지 TTS 재생
        if (choiceIndex === 4) {
            // 5번 선택지(직접 입력): 선택 시점에 TTS 생성 요청 후 완료 시 재생
            console.log('🎵 5번 선택지(직접 입력) TTS 생성 및 재생');
            this.generateAndPlayTTS(choiceText, true);
        } else {
            // 1-4번 선택지: 버퍼링된 TTS 재생
            this.playBufferedAudio(choiceIndex);
        }
        
        this.showLoading(true);
        
        try {
            // 선택지 텍스트만 전송 (번호 제외)
            console.log(`API로 전송할 텍스트: "${choiceText}"`);
            const response = await this.callOpenAI(choiceText, this.chatHistory);
            this.showLoading(false);
            this.processResponse(response);
        } catch (error) {
            console.error('선택지 처리 에러:', error);
            this.showLoading(false);
            this.addMessage('죄송합니다. 오류가 발생했습니다. 다시 시도해주세요.', 'character');
        }
    }

    // 선택지 제거 로직 (새로 구현 예정)

    animateRemoval(element) {
        // 1단계: 알파값 애니메이션
        element.classList.add('removing');
        
        // 2단계: 알파값이 0이 된 후 높이 애니메이션
        setTimeout(() => {
            element.classList.add('phase2');
        }, 200);
        
        // 3단계: 애니메이션 완료 후 DOM에서 제거
        setTimeout(() => {
            if (element.parentNode) {
                element.parentNode.removeChild(element);
            }
        }, 400); // 총 0.4초 (0.2초 + 0.2초)
    }

    showLoading(show) {
        const loading = document.getElementById('loading');
        if (show) {
            loading.classList.remove('hidden');
        } else {
            loading.classList.add('hidden');
        }
    }

    async generateCharacterImage(characterDescription) {
        try {
            console.log('🎨 ===== 캐릭터 이미지 생성 시작 =====');
            console.log('📝 캐릭터 설명:', characterDescription);
            console.log('🔑 Google API 키 확인:', this.googleApiKey ? '설정됨' : '설정되지 않음');
            
            // 현재 창의 가로세로 비율 계산
            const windowWidth = window.innerWidth;
            const windowHeight = window.innerHeight;
            const aspectRatio = windowWidth / windowHeight;
            
            console.log('📐 창 비율 정보:', { windowWidth, windowHeight, aspectRatio });
            
            // 창 비율에 맞는 이미지 크기 계산 (최대 1024px 기준)
            let imageWidth, imageHeight;
            if (aspectRatio > 1) {
                // 가로가 더 긴 경우
                imageWidth = 1024;
                imageHeight = Math.round(1024 / aspectRatio);
            } else {
                // 세로가 더 긴 경우
                imageHeight = 1024;
                imageWidth = Math.round(1024 * aspectRatio);
            }
            
            console.log('📐 계산된 이미지 크기:', { imageWidth, imageHeight, aspectRatio: imageWidth/imageHeight });

            const prompt = `Create a high-quality, cute and friendly character image that represents the following character description. 
            The character should be adorable, approachable, and suitable for a chat application background.
            
            Character Description: ${characterDescription}
            
            Requirements:
            - Cute, friendly, and approachable character design
            - Soft, warm colors and gentle lighting
            - Character should be full body or upper body visible
            - Background should be simple and not distracting
            - Anime or cartoon style preferred
            - High-quality, detailed image
            - Suitable for mobile chat background
            - Image dimensions: ${imageWidth}x${imageHeight} pixels
            - Image aspect ratio: ${aspectRatio.toFixed(2)} (${imageWidth}:${imageHeight})
            - Current window ratio: ${windowWidth}x${windowHeight}
            - Responsive design that adapts to current screen dimensions
            - Full viewport coverage without cropping
            - Ensure the image maintains the exact ${aspectRatio.toFixed(2)} aspect ratio
            - Character should look like they're ready to chat and be friendly`;

            console.log('📝 생성 프롬프트:', prompt.substring(0, 200) + '...');
            console.log('🌐 API 요청 URL:', 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent');
            
            // Nano Banana 모델을 위한 올바른 요청 구조
            const requestBody = {
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }]
            };
            
            console.log('📤 요청 본문:', JSON.stringify(requestBody, null, 2));

            // Gemini 2.5 Flash Image (Nano Banana) 모델 사용
            const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key=' + this.googleApiKey, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });

            console.log('📡 API 응답 상태:', response.status, response.statusText);
            console.log('📡 응답 헤더:', Object.fromEntries(response.headers.entries()));

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ API 오류 응답 - 상세 정보:');
                console.error('❌ - HTTP 상태:', response.status, response.statusText);
                console.error('❌ - 응답 본문:', errorText);
                console.error('❌ - API 키 사용됨:', this.googleApiKey ? '예' : '아니오');
                console.error('❌ - 요청 URL:', 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent');
                throw new Error(`Google API error: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            console.log('🎨 Google API 응답 데이터:', JSON.stringify(data, null, 2));

            // 응답 구조 분석
            console.log('🔍 응답 구조 분석:');
            console.log('- candidates 존재:', !!data.candidates);
            console.log('- candidates 길이:', data.candidates ? data.candidates.length : 0);
            
            if (data.candidates && data.candidates[0]) {
                const candidate = data.candidates[0];
                console.log('- candidate.content 존재:', !!candidate.content);
                console.log('- candidate.content.parts 존재:', !!(candidate.content && candidate.content.parts));
                console.log('- parts 길이:', candidate.content && candidate.content.parts ? candidate.content.parts.length : 0);
                
                if (candidate.content && candidate.content.parts) {
                    candidate.content.parts.forEach((part, index) => {
                        console.log(`- part[${index}] 타입:`, Object.keys(part));
                        console.log(`- part[${index}] inlineData 존재:`, !!part.inlineData);
                        if (part.inlineData) {
                            console.log(`- part[${index}] mimeType:`, part.inlineData.mimeType);
                            console.log(`- part[${index}] data 길이:`, part.inlineData.data ? part.inlineData.data.length : 0);
                        }
                    });
                }
            }

            // 응답에서 이미지 데이터 추출
            if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
                const parts = data.candidates[0].content.parts;
                for (const part of parts) {
                    if (part.inlineData) {
                        const imageData = part.inlineData;
                        const imageUrl = `data:${imageData.mimeType};base64,${imageData.data}`;
                        console.log('✅ 이미지 생성 성공!');
                        console.log('🖼️ 이미지 MIME 타입:', imageData.mimeType);
                        console.log('🖼️ 이미지 데이터 크기:', imageData.data.length, 'bytes');
                        console.log('🖼️ 이미지 URL 길이:', imageUrl.length);
                        return imageUrl;
                    }
                }
            }

            console.error('❌ 이미지 데이터를 찾을 수 없습니다 - 상세 분석:');
            console.error('❌ - 응답에 candidates가 있는가:', !!data.candidates);
            console.error('❌ - candidates 배열 길이:', data.candidates ? data.candidates.length : 0);
            
            if (data.candidates && data.candidates[0]) {
                const candidate = data.candidates[0];
                console.error('❌ - 첫 번째 candidate에 content가 있는가:', !!candidate.content);
                console.error('❌ - content에 parts가 있는가:', !!(candidate.content && candidate.content.parts));
                console.error('❌ - parts 배열 길이:', candidate.content && candidate.content.parts ? candidate.content.parts.length : 0);
                
                if (candidate.content && candidate.content.parts) {
                    candidate.content.parts.forEach((part, index) => {
                        console.error(`❌ - part[${index}] 키들:`, Object.keys(part));
                        console.error(`❌ - part[${index}] inlineData 존재:`, !!part.inlineData);
                    });
                }
            }
            
            console.error('🔍 전체 응답 구조:', JSON.stringify(data, null, 2));
            throw new Error('이미지 데이터를 찾을 수 없습니다');

        } catch (error) {
            console.error('❌ ===== 이미지 생성 오류 =====');
            console.error('❌ 오류 타입:', error.constructor.name);
            console.error('❌ 오류 메시지:', error.message);
            console.error('❌ 오류 스택:', error.stack);
            console.error('❌ API 키 상태:', this.googleApiKey ? '설정됨' : '설정되지 않음');
            console.error('❌ 캐릭터 설명:', characterDescription);
            console.error('❌ 요청 URL:', 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent');
            
            // 네트워크 오류인지 API 오류인지 구분
            if (error.message.includes('fetch')) {
                console.error('❌ 네트워크 오류로 추정됨');
            } else if (error.message.includes('Google API')) {
                console.error('❌ Google API 오류로 추정됨');
            } else {
                console.error('❌ 기타 오류로 추정됨');
            }
            
            // 기본 이미지나 플레이스홀더 반환
            return null;
        }
    }

    setChatBackground(imageUrl) {
        console.log('🖼️ ===== 배경 이미지 설정 시작 =====');
        console.log('🖼️ 이미지 URL:', imageUrl ? '제공됨' : '없음');
        
        const chatScreen = document.getElementById('chat');
        console.log('🖼️ 챗 화면 요소:', chatScreen);
        
        if (imageUrl) {
            console.log('🖼️ 배경 이미지 설정 중...');
            chatScreen.style.backgroundImage = `url(${imageUrl})`;
            chatScreen.style.backgroundSize = 'cover';
            chatScreen.style.backgroundPosition = 'center';
            chatScreen.style.backgroundRepeat = 'no-repeat';
            chatScreen.style.backgroundAttachment = 'fixed'; // 스크롤에 고정
            
            console.log('🖼️ 배경 스타일 적용됨:', {
                backgroundImage: chatScreen.style.backgroundImage,
                backgroundSize: chatScreen.style.backgroundSize,
                backgroundPosition: chatScreen.style.backgroundPosition,
                backgroundAttachment: chatScreen.style.backgroundAttachment
            });
            
            // 배경 이미지 위에 오버레이 추가하여 텍스트 가독성 향상
            chatScreen.style.position = 'relative';
            if (!chatScreen.querySelector('.background-overlay')) {
                console.log('🖼️ 오버레이 생성 중...');
                const overlay = document.createElement('div');
                overlay.className = 'background-overlay';
                overlay.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.3);
                    z-index: 1;
                    pointer-events: none;
                `;
                chatScreen.appendChild(overlay);
                console.log('🖼️ 오버레이 생성 완료');
            } else {
                console.log('🖼️ 오버레이 이미 존재함');
            }
            console.log('✅ 배경 이미지 설정 완료');
        } else {
            console.log('🖼️ 기본 그라데이션 배경 설정');
            // 기본 그라데이션 배경
            chatScreen.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
            chatScreen.style.backgroundImage = 'none';
            chatScreen.style.backgroundAttachment = 'fixed'; // 스크롤에 고정
            console.log('✅ 기본 배경 설정 완료');
        }
    }

    // 1. TTS 생성 및 등록 함수
    async generateAndPlayTTS(text, shouldPlayImmediately = true) {
        try {
            console.log('🎵 TTS 생성 및 등록 시작:', text.substring(0, 50) + '...');
            
            // TTS 중지 요청 확인
            if (this.stopRequested) {
                console.log('🚫 TTS 중지 요청이 있어 TTS 생성 건너뜀');
                return null;
            }
            
            // 기존 TTS 중지 (재귀 방지를 위해 직접 중지)
            if (this.currentAudio) {
                this.currentAudio.pause();
                this.currentAudio = null;
            }
            
            // TTS API 호출
            const audioUrl = await this.callTTSAPI(text);
            if (!audioUrl) {
                console.error('❌ TTS 생성 실패');
                return null;
            }
            
            const audio = new Audio(audioUrl);
            this.addAudioToDOM(audio);
            
            if (shouldPlayImmediately) {
                console.log('🎵 TTS 즉시 재생 시작');
                this.currentAudio = audio;
                await this.playAudio(audio);
            }
            
            return audio;
            
        } catch (error) {
            console.error('❌ TTS 생성 및 등록 오류:', error);
            return null;
        }
    }

    // 2. TTS 버퍼링 함수
    async bufferTTS(texts) {
        try {
            console.log('🎵 TTS 버퍼링 시작:', texts.length, '개 텍스트');
            
            // TTS 중지 요청 확인
            if (this.stopRequested) {
                console.log('🚫 TTS 중지 요청이 있어 TTS 버퍼링 건너뜀');
                return;
            }
            
            // 기존 버퍼 클리어
            this.clearAudioBuffers();
            
            // 모든 텍스트를 병렬로 TTS 생성
            const audioPromises = texts.map(async (text, index) => {
                try {
                    const audioUrl = await this.callTTSAPI(text);
                    if (audioUrl) {
                        const audio = new Audio(audioUrl);
                        this.addAudioToDOM(audio);
                        console.log(`🎵 버퍼 ${index + 1} TTS 생성 완료`);
                        return { index, audio, text };
                    }
                } catch (error) {
                    console.error(`❌ 버퍼 ${index + 1} TTS 생성 실패:`, error);
                }
                return null;
            });
            
            const results = await Promise.all(audioPromises);
            const validResults = results.filter(result => result !== null);
            
            // 버퍼에 저장
            validResults.forEach(result => {
                this.audioBuffers.set(result.index, result.audio);
            });
            
            console.log('🎵 TTS 버퍼링 완료:', validResults.length, '개 오디오');
            
        } catch (error) {
            console.error('❌ TTS 버퍼링 오류:', error);
        }
    }

    // 3. 모든 TTS 중지 함수
    stopAllTTS() {
        console.log('🚫 모든 TTS 중지 시작');
        
        // TTS 중지 요청 플래그 설정
        this.stopRequested = true;
        
        // 현재 재생 중인 오디오 중지
        if (this.currentAudio) {
            try {
                console.log('🚫 현재 재생 중인 오디오 중지');
                this.currentAudio.pause();
                this.currentAudio.currentTime = 0;
                this.currentAudio.volume = 0;
                this.currentAudio.muted = true;
                this.currentAudio.src = '';
                this.removeAudioFromDOM(this.currentAudio);
                this.currentAudio = null;
            } catch (error) {
                console.error('❌ 현재 오디오 중지 중 오류:', error);
            }
        }
        
        // 모든 버퍼된 오디오 중지
        this.audioBuffers.forEach((audio, index) => {
            try {
                console.log(`🚫 버퍼 ${index} 오디오 중지`);
                audio.pause();
                audio.currentTime = 0;
                audio.volume = 0;
                audio.muted = true;
                audio.src = '';
                this.removeAudioFromDOM(audio);
            } catch (error) {
                console.error(`❌ 버퍼 ${index} 중지 중 오류:`, error);
            }
        });
        this.audioBuffers.clear();
        
        // DOM의 모든 오디오 요소 중지
        const allAudios = document.querySelectorAll('audio');
        allAudios.forEach((audio, index) => {
            try {
                console.log(`🚫 DOM 오디오 ${index + 1} 중지`);
                audio.pause();
                audio.currentTime = 0;
                audio.volume = 0;
                audio.muted = true;
                audio.src = '';
            } catch (error) {
                console.error(`❌ DOM 오디오 ${index + 1} 중지 중 오류:`, error);
            }
        });
        
        console.log('✅ 모든 TTS 중지 완료');
    }

    // 캐릭터 메시지와 선택지들 표시 함수
    showCharacterMessage() {
        try {
            // 가장 최근의 캐릭터 메시지 찾기
            const characterMessages = document.querySelectorAll('.character-message');
            if (characterMessages.length > 0) {
                const latestMessage = characterMessages[characterMessages.length - 1];
                if (latestMessage.style.visibility === 'hidden') {
                    latestMessage.style.visibility = 'visible';
                    console.log('💬 캐릭터 메시지 말풍선 표시 (TTS 재생 시점)');
                }
            }
            
            // 선택지들은 3초 후에 표시
            this.choicesDisplayTimer = setTimeout(() => {
                this.showChoices();
            }, 3000);
            console.log('⏰ 선택지 표시 타이머 설정 (3초 후)');
        } catch (error) {
            console.error('❌ 메시지 표시 중 오류:', error);
        }
    }

    // 선택지들 표시 함수
    showChoices() {
        try {
            // 현재 대화의 선택지들 표시 (가장 최근 5개 user-message: 1-4번 선택지 + 5번 직접입력)
            const userMessages = document.querySelectorAll('.user-message');
            const recentChoices = Array.from(userMessages).slice(-5); // 최근 5개 선택지 (1-4번 + 5번 직접입력)
            
            recentChoices.forEach((choice, index) => {
                if (choice.style.visibility === 'hidden') {
                    choice.style.visibility = 'visible';
                    if (index === 4) {
                        console.log(`💬 5번 선택지(직접 입력) 표시 (캐릭터 말풍선 표시 3초 후)`);
                    } else {
                        console.log(`💬 선택지 ${index + 1} 표시 (캐릭터 말풍선 표시 3초 후)`);
                    }
                }
            });
        } catch (error) {
            console.error('❌ 선택지 표시 중 오류:', error);
        }
    }

    // TTS API 호출 함수 (Vercel 배포된 API 사용)
    async callTTSAPI(text) {
        try {
            console.log('🎵 TTS API 호출 (Vercel):', text.substring(0, 50) + '...');
            
            const response = await fetch('https://quiet-ink-groq.vercel.app/api/tts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text,
                    voice_id: this.ttsSettings.voiceId,
                    language: this.ttsSettings.language,
                    style: this.ttsSettings.style,
                    model: this.ttsSettings.model,
                    voice_settings: {
                        'pitch_shift': 0,
                        'pitch_variance': 1,
                        'speed': this.ttsSettings.speakingRate
                    }
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ TTS API 오류:', response.status, errorText);
                throw new Error(`TTS API error: ${response.status} - ${errorText}`);
            }

            const audioBuffer = await response.arrayBuffer();
            
            // 큰 오디오 파일을 안전하게 base64로 변환
            const uint8Array = new Uint8Array(audioBuffer);
            let binaryString = '';
            const chunkSize = 8192; // 청크 크기로 나누어 처리
            
            for (let i = 0; i < uint8Array.length; i += chunkSize) {
                const chunk = uint8Array.slice(i, i + chunkSize);
                binaryString += String.fromCharCode.apply(null, chunk);
            }
            
            const base64Audio = btoa(binaryString);
            const audioUrl = `data:audio/wav;base64,${base64Audio}`;
            
            console.log('✅ TTS API 호출 성공:', audioBuffer.byteLength, 'bytes');
            return audioUrl;
            
        } catch (error) {
            console.error('❌ TTS API 호출 오류:', error);
            return null;
        }
    }

    // 오디오 재생 함수
    async playAudio(audio) {
        return new Promise((resolve, reject) => {
            if (this.stopRequested) {
                console.log('🚫 재생 중지 요청으로 인한 오디오 재생 건너뜀');
                resolve();
                return;
            }
            
            audio.oncanplaythrough = () => {
                if (this.stopRequested) {
                    console.log('🚫 재생 중지 요청으로 인한 오디오 재생 중단');
                    resolve();
                    return;
                }
                console.log('🎵 오디오 로딩 완료, 재생 시작');
                // TTS 재생 시작 시점에 캐릭터 말풍선 표시
                this.showCharacterMessage();
                audio.play().catch(reject);
            };
            
            audio.onended = () => {
                console.log('🎵 오디오 재생 완료');
                this.currentAudio = null;
                resolve();
            };
            
            audio.onerror = () => {
                console.error('❌ 오디오 재생 오류');
                this.currentAudio = null;
                reject(new Error('오디오 재생 오류'));
            };
            
            audio.load();
        });
    }

    // 버퍼된 오디오 재생 함수
    async playBufferedAudio(index) {
        try {
            console.log(`🎵 버퍼된 오디오 ${index} 재생 시작`);
            
            if (this.stopRequested) {
                console.log('🚫 TTS 중지 요청이 있어 버퍼된 오디오 재생 건너뜀');
                return;
            }
            
            // 기존 TTS 중지 (재귀 방지를 위해 직접 중지)
            if (this.currentAudio) {
                this.currentAudio.pause();
                this.currentAudio = null;
            }
            
            const audio = this.audioBuffers.get(index);
            if (audio) {
                console.log('🎵 버퍼에서 오디오 찾음, 즉시 재생');
                this.currentAudio = audio;
                await this.playAudio(audio);
            } else {
                console.log('⚠️ 버퍼에서 오디오를 찾을 수 없음, 새로 생성');
                // 버퍼에 없으면 새로 생성
                const text = this.getBufferedText(index);
                if (text) {
                    await this.generateAndPlayTTS(text, true);
                }
            }
            
        } catch (error) {
            console.error('❌ 버퍼된 오디오 재생 오류:', error);
        }
    }

    // 오디오를 DOM에 추가하는 헬퍼 함수
    addAudioToDOM(audio) {
        try {
            audio.style.display = 'none';
            audio.style.visibility = 'hidden';
            audio.style.position = 'absolute';
            audio.style.left = '-9999px';
            document.body.appendChild(audio);
            console.log('✅ 오디오 엘리먼트를 DOM에 추가 완료');
        } catch (error) {
            console.error('❌ 오디오 엘리먼트 DOM 추가 실패:', error);
        }
    }

    // 오디오를 DOM에서 제거하는 헬퍼 함수
    removeAudioFromDOM(audio) {
        try {
            if (audio && audio.parentNode) {
                audio.parentNode.removeChild(audio);
                console.log('✅ 오디오 엘리먼트를 DOM에서 제거 완료');
            }
        } catch (error) {
            console.error('❌ 오디오 엘리먼트 DOM 제거 실패:', error);
        }
    }

    // 오디오 버퍼 클리어 함수
    clearAudioBuffers() {
        this.audioBuffers.forEach((audio, index) => {
            try {
                audio.pause();
                audio.currentTime = 0;
                audio.volume = 0;
                audio.muted = true;
                audio.src = '';
                this.removeAudioFromDOM(audio);
            } catch (error) {
                console.error(`❌ 버퍼 ${index} 클리어 중 오류:`, error);
            }
        });
        this.audioBuffers.clear();
        console.log('✅ 오디오 버퍼 클리어 완료');
    }

    // 버퍼된 텍스트 가져오기 함수 (임시 구현)
    getBufferedText(index) {
        // 실제로는 선택지 텍스트를 저장해두고 가져와야 함
        return null;
    }
}

// 앱 초기화
document.addEventListener('DOMContentLoaded', () => {
    new CharacterChat();
});
