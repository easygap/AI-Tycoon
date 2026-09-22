# 함께 쓰는 오픈소스

앱이 외부 CDN에 연결하지 않아도 화면을 표시할 수 있도록 아래 파일을 포함했습니다.

| 파일 | 출처 | 라이선스 |
| --- | --- | --- |
| `pixi.min.js` | [PixiJS 8.18.1](https://github.com/pixijs/pixijs) | MIT · [원문](PIXI-LICENSE.txt) |
| `iconify-icon.min.js` | [Iconify Icon 2.3.0](https://github.com/iconify/iconify) | MIT · [원문](ICONIFY-LICENSE.txt) |
| `solar-icons.js` | [Solar · 480 Design](https://www.figma.com/community/file/1166831539721848736) | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) |

Solar는 앱에서 사용하는 아이콘만 추려 JSON 형식으로 담았습니다. 도형은 수정하지 않았습니다. `node scripts/vendor-icons.js`로 다시 만들 수 있으며, 이 명령을 실행할 때만 Iconify API에 연결합니다.

작업실 라디오와 효과음은 프로젝트에서 직접 작성한 악보와 Web Audio 합성으로 재생합니다. 외부 음원은 사용하지 않습니다.

## 글꼴

| 파일 | 출처 | 라이선스 |
| --- | --- | --- |
| `WantedSansVariable.woff2` | [원티드랩 Wanted Sans 1.0.3](https://github.com/wanteddev/wanted-sans) | SIL OFL 1.1 · [원문](../fonts/WANTED-LICENSE.txt) |
| `Galmuri11.woff2` | [quiple Galmuri 2.40.3](https://github.com/quiple/galmuri) | SIL OFL 1.1 · [원문](../fonts/GALMURI-LICENSE.md) |
| `SUIT-Variable.woff2` | [sun-typeface SUIT](https://github.com/sun-typeface/SUIT) | SIL OFL 1.1 · 기존 테마 호환용 |

아이콘·픽셀 캐릭터·방과 가구는 프로젝트의 SVG 및 Canvas 코드로 그립니다. 게임의 그래픽 자산은 포함하지 않습니다.
