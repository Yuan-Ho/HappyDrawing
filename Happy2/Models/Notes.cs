using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using Microsoft.WindowsAzure.Storage.Table;
using System.Collections.Concurrent;

namespace Happy2
{
	public class NoteEntity : TableEntity
	{
		public int bx { get; set; }
		public int by { get; set; }

		public string hx { get; set; }
		public string hy { get; set; }

		public string note { get; set; }

		public NoteEntity()
		{
		}
		public NoteEntity(string partition_key, int note_id, NoteInfo info)
		{
			this.PartitionKey = partition_key;
			this.RowKey = Config.NOTE_KEY_PREFIX + note_id.ToString();

			this.bx = info.bx;
			this.by = info.by;

			this.hx = info.hx;
			this.hy = info.hy;

			this.note = info.note;
		}
	}
	public class NoteInfo
	{
		public int bx;
		public int by;

		public string hx;
		public string hy;

		public string note;

		public NoteInfo()
		{
		}
		//public NoteInfo(NoteEntity entity)
		//{
		//	this.bx = entity.BlockIndexX;
		//	this.by = entity.BlockIndexY;
		//	this.hx = entity.HeadX;
		//	this.hy = entity.HeadY;
		//	this.note = entity.Note;
		//}
		public NoteInfo(DynamicTableEntity entity)
		{
			this.bx = (int)entity["bx"].Int32Value;
			this.by = (int)entity["by"].Int32Value;
			this.hx = entity["hx"].StringValue;
			this.hy = entity["hy"].StringValue;
			this.note = entity["note"].StringValue;
		}
	}
	public class NoteRoll
	{
		private ConcurrentQueue<NoteInfo> queue = new ConcurrentQueue<NoteInfo>();

		public NoteRoll(string room_name)
		{
			DateTime date = DateTime.Now;

#if OLD
			for (int i = 4; i >= 0; i--)
			{
				NoteStore.GetNotes(room_name, date.AddDays(-i), addNote/*entity => addNote(entity)*/);
			}
#else
			int remaining = 100;
			int[] counts = new int[5];
			int[] starts = new int[counts.Length];

			for (int i = 0; i < counts.Length; i++)
			{
				int cnt = NoteStore.GetNumberOfNotes(room_name, date.AddDays(-i));
			
				counts[i] = Math.Min(cnt, remaining);
				starts[i] = cnt - counts[i];

				remaining -= counts[i];
			}
			for (int i = counts.Length - 1; i >= 0; i--)
			{
				if (counts[i] > 0)
					NoteStore.GetLastNotes(room_name, date.AddDays(-i), starts[i], counts[i], AddNote);
			}
#endif
		}
		//private void addNote(NoteEntity entity)
		//{
		//	NoteInfo info = new NoteInfo(entity);

		//	this.AddNote(info);
		//}
		public void AddNote(NoteInfo info)
		{
			this.queue.Enqueue(info);
		}
		public IEnumerable<NoteInfo> Get()
		{
			return queue;
		}
	}
	public static class NoteStore
	{
		public static void GetNotes(string room_name, DateTime date, Action<NoteEntity> act)
		{
			string partition_key = Config.ROOM_NAME_KEY_PREFIX + room_name.ToLowerInvariant() + Config.KEY_CONCAT + Util.DateTimeToString(date, 4);

			TableQuery<NoteEntity> query = new TableQuery<NoteEntity>().Where(
				TableQuery.GenerateFilterCondition("PartitionKey", QueryComparisons.Equal, partition_key));

			foreach (NoteEntity entity in Warehouse.NotesTable.ExecuteQuery(query))
			{
				if (entity.RowKey[0] != Config.SPECIAL_KEY_PREFIX)
					act(entity);
			}
		}
		public static void GetLastNotes(string room_name, DateTime date, int start, int count, Action<NoteInfo> act)
		{
			string partition_key = Config.ROOM_NAME_KEY_PREFIX + room_name.ToLowerInvariant() + Config.KEY_CONCAT + Util.DateTimeToString(date, 4);

			Warehouse.NotesTable.EnumerateRowRange(partition_key, Config.NOTE_KEY_PREFIX.ToString(), start, count,
				entity => act(new NoteInfo(entity)));
		}
		public static int GetNumberOfNotes(string room_name, DateTime date)
		{
			string partition_key = Config.ROOM_NAME_KEY_PREFIX + room_name.ToLowerInvariant() + Config.KEY_CONCAT + Util.DateTimeToString(date, 4);

			TableResult result = Warehouse.NotesTable.Execute(TableOperation.Retrieve(partition_key, Config.SPECIAL_KEY));
			DynamicTableEntity entity = (DynamicTableEntity)result.Result;

			if (entity == null)
				return 0;
			else
				return (int)entity["nextid"].Int32Value;
		}
		public static void AddNote(string room_name, NoteInfo info)
		{
			DateTime date = DateTime.Now;
			//date = date.AddDays(-new Random().NextDouble() * 4 - 1);		// test only

			string partition_key = Config.ROOM_NAME_KEY_PREFIX + room_name.ToLowerInvariant() + Config.KEY_CONCAT + Util.DateTimeToString(date, 4);

			TableResult result = Warehouse.NotesTable.Execute(TableOperation.Retrieve(partition_key, Config.SPECIAL_KEY));
			DynamicTableEntity entity = (DynamicTableEntity)result.Result;

			if (entity == null)
			{
				entity = new DynamicTableEntity(partition_key, Config.SPECIAL_KEY);
				entity["nextid"] = new EntityProperty(0);
				Warehouse.NotesTable.Execute(TableOperation.Insert(entity));
			}
			int next_id = (int)entity["nextid"].Int32Value;
			entity["nextid"].Int32Value = next_id + 1;

			Warehouse.NotesTable.Execute(TableOperation.Replace(entity));      // Throws StorageException ((412) Precondition Failed) if the entity is modified in between.
			//
			NoteEntity note_entity = new NoteEntity(partition_key, next_id, info);

			Warehouse.NotesTable.Execute(TableOperation.Insert(note_entity));		// StorageException: 遠端伺服器傳回一個錯誤: (409) 衝突。 if the key already exists.
		}
	}
}