"""报告 API"""

import asyncio
import threading
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session

from app.core.database import get_db, SessionLocal
from app.models.db_models import Subject, Report
from app.models.schemas import ReportResponse, GenerateRequest
from app.services.report_service import generate_full_report

router = APIRouter(prefix="/api/reports", tags=["报告"])


@router.get("/{subject_id}", response_model=ReportResponse)
def get_report(subject_id: int, db: Session = Depends(get_db)):
    """获取命主的报告"""
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="命主不存在")

    report = db.query(Report).filter(Report.subject_id == subject_id).first()

    return ReportResponse(
        subject_id=subject_id,
        status=subject.report_status or "未生成",
        master_report=report.master_report if report else None,
        consumer_report=report.consumer_report if report else None,
        wechat_report=report.wechat_report if report else None,
        html_report=report.html_report if report else None,
        generated_at=report.generated_at.strftime("%Y-%m-%d %H:%M") if report and report.generated_at else None,
        progress=subject.report_progress or None,
    )


def _run_generate_in_thread(subject_id: int):
    """在独立线程中运行异步报告生成"""
    db = SessionLocal()
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(generate_full_report(subject_id, db))
        loop.close()
    except Exception as exc:
        print(f"报告生成失败: {exc}")
    finally:
        db.close()


@router.post("/generate")
def trigger_generate(data: GenerateRequest, db: Session = Depends(get_db)):
    """触发报告生成（后台异步）"""
    subject = db.query(Subject).filter(Subject.id == data.subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="命主不存在")

    if subject.report_status == "生成中":
        raise HTTPException(status_code=409, detail="报告正在生成中，请稍候")

    subject.report_status = "生成中"
    subject.report_progress = "排队中"
    db.commit()

    thread = threading.Thread(target=_run_generate_in_thread, args=(data.subject_id,))
    thread.daemon = True
    thread.start()

    return {"message": "报告生成已启动", "subject_id": data.subject_id}
