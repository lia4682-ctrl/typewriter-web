<style>{`
        .typewriter-screen {
          width: 100vw;
          height: 100dvh;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          position: relative;
          box-sizing: border-box;
        }
        .typewriter-container {
          width: 90%;
          max-width: 680px;
          aspect-ratio: 16 / 12;
          position: relative;
          display: flex;
          justify-content: center;
          align-items: center;
          margin-bottom: 80px;
        }
        .typewriter-input-wrapper {
          position: absolute;
          top: 24%; /* 더 위로 올림 */
          left: 32%;
          width: 36%;
          height: 14%;
          padding: 4px;
          box-sizing: border-box;
          z-index: 3;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
        }
        @media (max-width: 768px) {
          .typewriter-container {
            width: 95%;
            max-width: 460px;
            margin-bottom: 90px;
          }
          .typewriter-input-wrapper {
            top: 22%; /* 모바일 화면에서도 더 위로 올림 */
            left: 30%;
            width: 40%;
            height: 15%;
          }
        }
      `}</style>
