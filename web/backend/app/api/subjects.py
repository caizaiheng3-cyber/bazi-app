"""命主 CRUD API"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.models.db_models import Subject
from app.models.schemas import SubjectCreate, SubjectUpdate, SubjectResponse

router = APIRouter(prefix="/api/subjects", tags=["命主"])


def _format_subject(subject: Subject) -> SubjectResponse:
    return SubjectResponse(
        id=subject.id,
        name=subject.name,
        gender=subject.gender,
        birth_date=subject.birth_date,
        birth_time=subject.birth_time,
        calendar_type=subject.calendar_type,
        birth_city=subject.birth_city,
        notes=subject.notes or "",
        report_status=subject.report_status or "未生成",
        created_at=subject.created_at.strftime("%Y-%m-%d %H:%M"),
        updated_at=subject.updated_at.strftime("%Y-%m-%d %H:%M"),
        info_updated_after_report=subject.info_updated_after_report or False,
    )


@router.get("", response_model=List[SubjectResponse])
def list_subjects(db: Session = Depends(get_db)):
    """获取所有命主列表（按创建时间倒序）"""
    subjects = db.query(Subject).order_by(Subject.created_at.desc()).all()
    return [_format_subject(s) for s in subjects]


@router.post("", response_model=SubjectResponse, status_code=201)
def create_subject(data: SubjectCreate, db: Session = Depends(get_db)):
    """新增命主"""
    subject = Subject(
        name=data.name,
        gender=data.gender,
        birth_date=data.birth_date,
        birth_time=data.birth_time,
        calendar_type=data.calendar_type,
        birth_city=data.birth_city,
        notes=data.notes or "",
    )
    db.add(subject)
    db.commit()
    db.refresh(subject)
    return _format_subject(subject)


@router.get("/{subject_id}", response_model=SubjectResponse)
def get_subject(subject_id: int, db: Session = Depends(get_db)):
    """获取单个命主详情"""
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="命主不存在")
    return _format_subject(subject)


@router.put("/{subject_id}", response_model=SubjectResponse)
def update_subject(subject_id: int, data: SubjectUpdate, db: Session = Depends(get_db)):
    """更新命主信息"""
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="命主不存在")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(subject, field, value)

    if subject.report_status == "已生成":
        subject.info_updated_after_report = True

    db.commit()
    db.refresh(subject)
    return _format_subject(subject)
