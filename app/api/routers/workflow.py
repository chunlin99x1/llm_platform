from fastapi import APIRouter, HTTPException
from fastapi.concurrency import run_in_threadpool
from langchain_core.messages import HumanMessage
from tortoise.transactions import in_transaction

from app.core.workflow import build_graph
from app.db.models import NodeRun, WorkflowRun
from app.schemas import WorkflowRunRequest, WorkflowRunResponse

router = APIRouter()


@router.post("/workflow/run", response_model=WorkflowRunResponse)
async def run_workflow(payload: WorkflowRunRequest):
    """
    Run a minimal Start -> LLM -> End workflow via LangGraph.
    """
    graph = build_graph()
    state = {"messages": [HumanMessage(content=payload.input)], "context": payload.context}

    try:
        async with in_transaction():
            run = await WorkflowRun.create(workflow_name="demo_graph", status="running", input_text=payload.input)

            # LangGraph compiled app supports stream; here we use invoke for simplicity
            result_state = await run_in_threadpool(graph.invoke, state)
            output_messages = result_state["messages"]
            last_message = output_messages[-1] if output_messages else None
            output_text = getattr(last_message, "content", "") if last_message else ""

            await NodeRun.create(
                workflow_run=run,
                node_name="llm",
                status="succeeded",
                payload={"output": output_text},
            )

            run.status = "succeeded"
            run.output_text = output_text
            await run.save()

        return WorkflowRunResponse(run_id=run.id, output=run.output_text or "")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
