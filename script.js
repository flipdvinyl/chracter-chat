class CharacterChat {
    constructor() {
        this.apiKey = process.env.OPENAI_API_KEY || 'YOUR_OPENAI_API_KEY_HERE';
        this.currentCharacter = null;
        this.chatHistory = [];
        this.summary = ""; // 대화 요약 관리
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

        // 키보드 단축키 (1,2,3,4) - 0부터 시작하는 인덱스로 통일
        document.addEventListener('keydown', (e) => {
            if (e.key >= '1' && e.key <= '4') {
                const choiceIndex = parseInt(e.key) - 1; // 1->0, 2->1, 3->2, 4->3
                console.log(`키보드 ${e.key} 누름 -> 인덱스 ${choiceIndex}`);
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

    showLanding() {
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
        
        this.showLoading(true);
        
        try {
            console.log('=== 초기 프롬프트 전송 ===');
            const prompt = this.getPersona();
            console.log(prompt);
            console.log('=======================');
            
            const response = await this.callOpenAI("환영 인사를 해주세요", []);
            this.showLoading(false);
            this.processResponse(response);
        } catch (error) {
            console.error('API 호출 에러:', error);
            this.showLoading(false);
            this.addMessage('죄송합니다. 오류가 발생했습니다. 다시 시도해주세요.', 'character');
        }
    }

    getPersona() {
        return `너와 캐릭터챗을 할거야. 내가 정해준 캐릭터가 되어 나와 캐릭터챗을 하는것처럼 답변해줘. 1) 내가 질문을 하면 너는 해당 캐릭터가 되서 답변을 하고. 2) 그 답변에 이어지는 내가 했으면 하는 답변도 객관식으로 4개를 제안해줘. 제안하는 텍스트도 마치 내가 너에게 묻는 것처럼 대화체로 출력해야해. 제안 답변 내용만 출력하고 불필요한 텍스트는 출력하지마. 단, 4번째 선택지는 항상 '다른 이야기를 해보고 싶어-'이고 이때는 내가 자유롭게 새로운 주제를 기반으로 답변해줘. 자유롭되 너의 페르소나나 캐릭터 특성에 기반한 제안이면 좋자. 이 질문에 답변할때도 여전히 4가지 선택지를 제안해야해 3) 내가 그 객관식중에 답변 번호를 입력하면 너는 또 거기에 맞는 대화를 계속 이어하는 형태야. 즉, 너와 객관식 답변으로 캐릭터챗을 이어가는거지. 4) 답변과 객관식 추가 답변 텍스트를 제외하고는 어떤 텍스트도 출력하지마.   

이제 너의 캐릭터는 쿠마모토현의 대표 캐릭터인 쿠마몬이야. 그럼 너의 환영 인사부터 챗을 시작해보자.

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
        
        choices.forEach((choice, index) => {
            if (choice.trim()) {
                // 선택지에서 숫자 제거 (1. 2. 3. 4. 등)
                const cleanChoice = choice.replace(/^\d+\.\s*/, '').trim();
                console.log(`선택지 ${index + 1} 추가:`, cleanChoice);
                this.addMessage(cleanChoice, 'user', index);
            } else {
                console.log(`선택지 ${index + 1} 비어있음`);
            }
        });

        // 5번 선택지 추가 (직접 입력)
        this.addCustomInputChoice();
    }

    addCustomInputChoice() {
        const chatMessages = document.getElementById('chat-messages');
        const inputContainer = document.createElement('div');
        inputContainer.className = 'message user-message custom-input-container';
        // data-choice-number 제거 (숫자 표시 안함)
        
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
}

// 앱 초기화
document.addEventListener('DOMContentLoaded', () => {
    new CharacterChat();
});
