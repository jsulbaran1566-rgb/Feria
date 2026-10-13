from fastapi.responses import JSONResponse


def respuesta_ok(message: str, data=None, status_code: int = 200):
    return JSONResponse(
        status_code=status_code,
        content={
            "success": True,
            "message": message,
            "data": data,
            "error": None,
        },
    )


def respuesta_error(message: str, status_code: int = 400, error: str = None):
    return JSONResponse(
        status_code=status_code,
        content={
            "success": False,
            "message": message,
            "data": None,
            "error": error or message,
        },
    )