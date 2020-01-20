using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using Microsoft.WindowsAzure.Storage.Table;

namespace Happy2
{
	public class FigureInfo : IInitializeByEntity
	{
		public string Name;
		public string Uri;
		public string UserId;

		public FigureInfo()
		{
		}
		public void Initialize(DynamicTableEntity entity)
		{
			this.Name = entity["Name"].StringValue;
			this.Uri = entity["Uri"].StringValue;
			this.UserId = entity["UserId"].StringValue;
		}	
	}
	public class FigureInfoEntity : TableEntity
	{
		public string Name { get; set; }
		public string Uri { get; set; }
		public DateTime SaveDate { get; set; }
		public string UserId { get; set; }

		public FigureInfoEntity()
		{
		}
		public FigureInfoEntity(string room_name, int figure_id, string figure_name, string uri, string user_id)
		{
			int page_id = (int)(figure_id / Config.NUM_FIGURES_IN_A_PAGE);
			int inner_id = figure_id - page_id * Config.NUM_FIGURES_IN_A_PAGE;

			this.PartitionKey = Config.ROOM_NAME_KEY_PREFIX + room_name.ToLowerInvariant() + Config.NAME_CONCAT +
								Config.ROOM_PAGE_KEY_PREFIX + page_id.ToString();
			this.RowKey = Config.ROOM_INNER_KEY_PREFIX + inner_id.ToString("D" + Config.FIGURE_INNER_KEY_DIGITS);

			this.Name = figure_name;
			this.Uri = uri;
			this.SaveDate = DateTime.Now;
			this.UserId = user_id;
		}
	}
	public static class FigureCenter
	{
		public static IEnumerable<FigureInfo> GetFigurePage(string room_name, ref int page_id)
		{
			if (page_id == -1)
			{
				string partition_key = Config.ROOM_NAME_KEY_PREFIX + room_name.ToLowerInvariant();

				DynamicTableEntity entity = Warehouse.FiguresRowPond.Get(partition_key, Config.SPECIAL_KEY);

				if (entity == null)
					return null;

				int last_id = (int)entity["nextid"].Int32Value - 1;
				page_id = (int)(last_id / Config.NUM_FIGURES_IN_A_PAGE);
			}
			string partition_key2 = Config.ROOM_NAME_KEY_PREFIX + room_name.ToLowerInvariant() + Config.NAME_CONCAT +
									Config.ROOM_PAGE_KEY_PREFIX + page_id.ToString();
			IEnumerable<FigureInfo> list = Warehouse.FiguresPartitionPond.Get(partition_key2);

			return list;
		}
	}
	public static class FigureStore
	{
#if NOT_TESTED
		private static FigureInfoEntity getFigure(string room_name, int figure_id)
		{
			int page_id = (int)(figure_id / Config.NUM_FIGURES_IN_A_PAGE);
			int inner_id = figure_id - page_id * Config.NUM_FIGURES_IN_A_PAGE;

			string partition_key = Config.ROOM_NAME_KEY_PREFIX + room_name.ToLowerInvariant() + Config.NAME_CONCAT +
									Config.ROOM_PAGE_KEY_PREFIX + page_id.ToString();
			string row_key = Config.ROOM_INNER_KEY_PREFIX + inner_id.ToString("D" + Config.FIGURE_INNER_KEY_DIGITS);

			TableOperation op = TableOperation.Retrieve<FigureInfoEntity>(partition_key, row_key);

			TableResult result = Warehouse.FiguresTable.Execute(op);

			return (FigureInfoEntity)result.Result;
		}
		public static FigureInfoEntity GetFigure(string room_name, string figure_name)
		{
			string partition_key = Config.ROOM_NAME_KEY_PREFIX + room_name.ToLowerInvariant() + Config.NAME_CONCAT +
									Config.FIGURE_KEY_PREFIX + figure_name.ToLowerInvariant();

			TableOperation op = TableOperation.Retrieve(partition_key, Config.EMPTY_KEY);
			TableResult result = Warehouse.FiguresTable.Execute(op);		// StorageException: 遠端伺服器傳回一個錯誤: (400) 不正確的要求。 if partition_key is invalid.

			DynamicTableEntity entity = (DynamicTableEntity)result.Result;

			if (entity != null)
			{
				int figure_id = (int)entity["figureid"].Int32Value;

				return getFigure(room_name, figure_id);
			}
			else
				return null;
		}
#endif
		private static void createFigureNameEntry(string room_name, int next_id, string figure_name)
		{
			string partition_key = Config.ROOM_NAME_KEY_PREFIX + room_name.ToLowerInvariant() + Config.NAME_CONCAT +
									Config.FIGURE_KEY_PREFIX + figure_name.ToLowerInvariant();

			DynamicTableEntity rn_entity = new DynamicTableEntity(partition_key, Config.EMPTY_KEY);

			rn_entity["figureid"] = new EntityProperty(next_id);

			Warehouse.FiguresTable.Execute(TableOperation.Insert(rn_entity));		// StorageException: 遠端伺服器傳回一個錯誤: (409) 衝突。 if already exists.
		}
		public static bool CreateFigure(string room_name, string figure_name, string uri, string user_id)
		{
			string partition_key = Config.ROOM_NAME_KEY_PREFIX + room_name.ToLowerInvariant();

			TableResult result = Warehouse.FiguresTable.Execute(TableOperation.Retrieve(partition_key, Config.SPECIAL_KEY));
			DynamicTableEntity entity = (DynamicTableEntity)result.Result;

			if (entity == null)
			{
				entity = new DynamicTableEntity(partition_key, Config.SPECIAL_KEY);

				entity["nextid"] = new EntityProperty(0);

				Warehouse.FiguresTable.Execute(TableOperation.Insert(entity));
			}
			int next_id = (int)entity["nextid"].Int32Value;

			createFigureNameEntry(room_name, next_id, figure_name);		// let it throw exception if the name already exists.

			entity["nextid"].Int32Value = next_id + 1;

			Warehouse.FiguresTable.Execute(TableOperation.Replace(entity));      // Throws StorageException ((412) Precondition Failed) if the entity is modified in between.
			Warehouse.FiguresRowPond.Notify(entity.PartitionKey, entity.RowKey);

			FigureInfoEntity ri_entity = new FigureInfoEntity(room_name, next_id, figure_name, uri, user_id);
			Warehouse.FiguresTable.Execute(TableOperation.Insert(ri_entity));		// StorageException: 遠端伺服器傳回一個錯誤: (409) 衝突。 if the key already exists.
			Warehouse.FiguresPartitionPond.Notify(ri_entity.PartitionKey);

			return true;
		}
	}
}