# Markdown 관리 페이지 (Django)

다수 Markdown 문서를 업로드/관리하고, 라인 단위 중요 표시와 코멘트 협업을 할 수 있는 Django 웹앱입니다.

## 포함 기능

- 다수 `.md` 파일 업로드
- 텍스트 직접 입력으로 문서 생성
- ` ```mermaid ` 코드블록(flowchart/sequence 등) 렌더링
- 문서 검색, 미리보기, 삭제
- 라인 단위 중요 표시(토글)
- 문서/라인 코멘트 작성 및 삭제
- 중요 라인 + 코멘트를 바탕으로 리뷰 요약 Markdown 생성/다운로드
- 5초 간격 자동 동기화
- Django Admin에서 데이터 직접 관리 가능

## 실행 방법

1. 가상환경(선택)

```bash
python -m venv .venv
.venv\Scripts\activate
```

2. 의존성 설치

```bash
python -m pip install -r requirements.txt
```

3. 마이그레이션

```bash
python manage.py migrate
```

4. 실행

```bash
python manage.py runserver
```

브라우저에서 `http://127.0.0.1:8000` 접속.

## 관리자 페이지

- URL: `http://127.0.0.1:8000/admin`
- 슈퍼유저 생성:

```bash
python manage.py createsuperuser
```

## 주요 경로

- 화면: `/`
- API:
  - `GET/POST /api/docs/`
  - `GET/PUT/DELETE /api/docs/<id>/`
  - `POST /api/docs/<id>/important/`
  - `POST /api/docs/<id>/comments/`
  - `DELETE /api/docs/<id>/comments/<comment_id>/`
