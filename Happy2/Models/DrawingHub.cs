using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using Microsoft.AspNet.SignalR;
using Newtonsoft.Json;
using System.Threading;
using System.Diagnostics;

namespace Happy2
{
	public class DrawingBroadcaster
	{
		private readonly static Lazy<DrawingBroadcaster> _instance = new Lazy<DrawingBroadcaster>(() => new DrawingBroadcaster());
		private readonly IHubContext _hubContext;

		private Timer _broadcastLoop;
		private Dictionary<string, List<PathModel>> waitingPaths = new Dictionary<string, List<PathModel>>();

		public static DrawingBroadcaster Instance
		{
			get { return _instance.Value; }
		}
		public static IHubContext HubContext
		{
			get { return Instance._hubContext; }
		}
		public DrawingBroadcaster()
		{
			_hubContext = GlobalHost.ConnectionManager.GetHubContext<DrawingHub>();
			_broadcastLoop = new Timer(doBroadcast, null, 1000/*ms*/, 1000/*ms*/);
		}
		private void doBroadcast(object state)
		{
			lock (waitingPaths)
			{
				foreach (KeyValuePair<string, List<PathModel>> pair in waitingPaths)
				{
					if (pair.Value.Count != 0)
					{
						//_hubContext.Clients.All.onNewPaths(waitingPaths);
						_hubContext.Clients.Group(pair.Key).onNewPaths(pair.Value);

						pair.Value.Clear();
					}
				}
			}
		}
		public void AddPath(PathModel path_model, string room_name)
		{
			lock (waitingPaths)
			{
				List<PathModel> list;

				if (!waitingPaths.TryGetValue(room_name, out list))
				{
					list = new List<PathModel>();
					waitingPaths.Add(room_name, list);
				}
				list.Add(path_model);
				//waitingPaths.Add(path_model);
			}
		}
	}
	public static class PathCenter
	{
		private static Timer earlyTimer;
		private static Dictionary<string, List<PathModel>> earlyDict = new Dictionary<string, List<PathModel>>();

		static PathCenter()
		{
			earlyTimer = new Timer(broadcastEarly, null, 500/*ms*/, 500/*ms*/);
		}
		private static void broadcastEarly(object state)
		{
			lock (earlyDict)
			{
				foreach (KeyValuePair<string, List<PathModel>> pair in earlyDict)
				{
					if (pair.Value.Count != 0)
					{
						DrawingBroadcaster.HubContext.Clients.Group(pair.Key).onEarlyPaths(pair.Value);
						pair.Value.Clear();
					}
				}
			}
		}
		public static void AddEarlyPath(PathModel path_model, string room_name)
		{
			lock (earlyDict)
			{
				List<PathModel> list;

				if (!earlyDict.TryGetValue(room_name, out list))
				{
					list = new List<PathModel>();
					earlyDict.Add(room_name, list);
				}
				list.Add(path_model);
			}
		}
	}
	public class DrawingHub : Hub
	{
		private DrawingBroadcaster _broadcaster;

		public DrawingHub()
			: this(DrawingBroadcaster.Instance)
		{
		}
		public DrawingHub(DrawingBroadcaster broadcaster)
		{
			_broadcaster = broadcaster;
		}
		public void AddEarlyPath(PathModel model, string room_name)
		{
			string canonical_room_name = RoomNameGuard.CheckName(room_name);

			PathCenter.AddEarlyPath(model, canonical_room_name);
		}
		public int/*0=suc, 1=fail, 2=full, 3=suc almost full, 4=too fast*/ DrawPaths(PathModel[] models, string room_name)
		{
			string canonical_room_name = RoomNameGuard.CheckName(room_name);

			if (Limiter.IsOverRate(Context.ConnectionId))
				return 4;

			// Order inversion may happen when current paths are still under processing and next paths rush in in a new thread.
			// This causes later path gets smaller gsid.

			int ret = 0;
			//Trace.TraceInformation("DrawPaths. models.Length={0}.", models.Length);

			string batch_uri = null;
			int batch_gsid = 0;

			for (int i = 0; i < models.Length; i++)
			{
				PathModel model = models[i];

				if (model.Type == (int)PathType.PT_BATCH)
					if (model.DxDyCombined == batch_uri)
						model.Gsid = batch_gsid;
					else
					{
						model.Gsid = GsidManager.Get(canonical_room_name);		// Negative and 0 GSIDs are also valid.
						batch_gsid = model.Gsid;
						batch_uri = model.DxDyCombined;

						// make all flag paths have same gsid. Otherwise path orders are affected by flag path's GSID. Batch path's order should depend on subid only.
					}
				else
					model.Gsid = GsidManager.Get(canonical_room_name);		// Negative and 0 GSIDs are also valid.

				int r = DrawAPath5(model, canonical_room_name);
				if (r != 0)
					ret = r;
			}
			return ret;
		}
		private int/*0=suc, 1=fail, 2=full, 3=suc almost full, 4=too fast*/ DrawAPath5(PathModel model, string room_name)
		{
			// If client is old and layer ("l") is not included in upload, model.Layer will be 0.

			// path_model.UpdatedBy = Context.ConnectionId;
			// Clients.AllExcept(path_model.UpdatedBy).drawAPath(path_model);

			//if (_broadcaster.IsOverRate(Context.ConnectionId))

			int ret = Warehouse.BlockPathsPond.AddPath(model);
			if (ret == 0 || ret == 3)
				_broadcaster.AddPath(model, room_name);

			//Trace.TraceInformation("DrawAPath5. Gsid={0}, type={1}.", model.Gsid, model.Type);

			return ret;
		}
		public IEnumerable<PathModel> GetStoredPaths3(int bx, int by)
		{
			return Warehouse.BlockPathsPond.GetBlockPaths(bx, by);

			// return _broadcaster.GetStoredPaths();
		}
		public List<IEnumerable<PathModel>> GetStoredPaths4(BlockIndex[] bx_bys)
		{
			List<IEnumerable<PathModel>> list = new List<IEnumerable<PathModel>>();

			foreach (BlockIndex block_idx in bx_bys)
			{
				IEnumerable<PathModel> e = Warehouse.BlockPathsPond.GetBlockPaths(block_idx.x, block_idx.y);
				list.Add(e);
			}
			return list;
		}
		public void UpdatePosition2(string user_id, double x, double y, string room_name)
		{
			string canonical_room_name = RoomNameGuard.CheckName(room_name);

			UserCenter.UpdatePosition(canonical_room_name, user_id, x, y);
			HotRoomCenter.Update(canonical_room_name, user_id);
		}
		public void UpdateStatus2(string user_id, string name, string status, string room_name)
		{
			string canonical_room_name = RoomNameGuard.CheckName(room_name);

			if (name != null && status != null)
				if (name.Length <= 20 && status.Length <= 100)
				{
					//ChatManager.Add(name, status);
					ChatPond.AddChat(canonical_room_name, name, status);

					UserCenter.UpdateStatus(canonical_room_name, user_id, name, status);
				}
		}
		public IEnumerable<UserWords> GetChat(string room_name)
		{
			string canonical_room_name = RoomNameGuard.CheckName(room_name);

			//return ChatManager.Get(room);
			return ChatPond.Get(canonical_room_name);
		}
		public IDictionary<string, UserStatus> GetAllStatus(string room_name)
		{
			string canonical_room_name = RoomNameGuard.CheckName(room_name);

			return UserCenter.GetAllStatus(canonical_room_name);
		}
		public RoomInfo GetRoom(string name/*case may be incorrect.*/)
		{
			//RoomHomeManager.UpdateRoomHome(name);

			RoomInfo room_info = RoomsPond.Get(name);

			if (room_info != null)
			{
				RoomHomeManager.UpdateRoomHome(room_info.Name);

				GroupManager.EnterRoom(Groups, Context.ConnectionId, room_info.Name);
			}
			return room_info;
		}
		public bool CreateFigure(string room_name, string figure_name, string uri, string user_id)
		{
			if (figure_name.Length > 100 || figure_name.Length < 1)
				return false;
			if (!Util.WithinCharSetUserName(figure_name))
				return false;

			string canonical_room_name = RoomNameGuard.CheckName(room_name);

			bool ret = FigureStore.CreateFigure(canonical_room_name, figure_name, uri, user_id);

			if (ret)
				Clients.Group(canonical_room_name).onNewFigure();
			return ret;
		}
		public bool CreateRoom(string name, int size, int attr)
		{
			if (name.Length > 100 || name.Length < 1)
				return false;
			if (!Util.WithinCharSetUserName(name))
				return false;

			if (size != 3 && size != 5 && size != 7 && size != 9)
				return false;

			return RoomStore.CreateRoom(name, size, attr);
		}
		public string GetRoomList()
		{
			return RoomList.GetRoomList();
		}
		public object GetFigurePage(string room_name, int page_id)
		{
			string canonical_room_name = RoomNameGuard.CheckName(room_name);

			IEnumerable<FigureInfo> list = FigureCenter.GetFigurePage(canonical_room_name, ref page_id);

			return new { page_id = page_id, list = list };
		}
		public IEnumerable<UserCount> GetHotRoomList()
		{
			return HotRoomCenter.GetHotRoomList();
		}
		//public IEnumerable<PictureInfo> GetPictureList(string room)
		//{
		//	return PictureManager.Get(room);
		//}
		public void AddNote(string room_name, NoteInfo info)
		{
			NotePond.AddNote(room_name, info);

			Clients.Group(room_name).onNewNote(info);
		}
		public IEnumerable<NoteInfo> GetNoteList(string room_name)
		{
			return NotePond.Get(room_name);
		}
	}
	public class PathModel
	{
		[JsonProperty("t")]
		public int Type { get; set; }		// 0=invalid, 1=pencil, 2=eraser, 3=scissor, 4=trash.
		[JsonProperty("u")]
		public string UserId { get; set; }

		[JsonProperty("l")]
		public int Layer { get; set; }
		[JsonProperty("z")]
		public int Zoom { get; set; }
		[JsonProperty("tm")]
		public string TransformMatrix { get; set; }
		[JsonProperty("o")]
		public string Color { get; set; }
		[JsonProperty("s")]
		public int TipSize { get; set; }

		[JsonProperty("b")]
		public int BrushId { get; set; }
		[JsonProperty("r")]
		public int Blur { get; set; }
		[JsonProperty("i")]
		public string Idiosyncrasy { get; set; }

		[JsonProperty("hx")]
		public string HeadX { get; set; }
		[JsonProperty("hy")]
		public string HeadY { get; set; }

		[JsonProperty("bx")]
		public int BlockIndexX { get; set; }
		[JsonProperty("by")]
		public int BlockIndexY { get; set; }

		[JsonProperty("c")]
		public string DxDyCombined { get; set; }
		[JsonProperty("g")]
		public int Gsid { get; set; }
	}
}
