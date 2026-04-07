import asyncio
from routers.proxies import geocode_proxy

async def main():
    try:
        res = await geocode_proxy("pune")
        print(res)
    except Exception as e:
        import traceback
        traceback.print_exc()

asyncio.run(main())
