import type { UniqueIdentifier } from '@dnd-kit/core';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { Activity } from 'react';

import { mergeStyles } from '@/src/shared/utils';

import Card from '../../Card/Card';
import CardActions from '../../Card/components/CardActions';
import CardContent from '../../Card/components/CardContent';
import DraggableComponent from '../../DraggableComponent/DraggableComponent';

type CardListItemProps = Partial<{
  id: UniqueIdentifier;
  children: Readonly<React.ReactNode>;
  actions: Readonly<React.ReactNode>;
  actionsClassName?: string;
  draggable: boolean;
  editing: boolean;
  form: Readonly<React.ReactNode>;
}>;

const CardListItem = (props: CardListItemProps) => {
  const { id = '', children, actions, actionsClassName = '', draggable = false, editing = false, form } = props;

  return (
    <>
      <Activity mode={editing ? 'hidden' : 'visible'}>
        <DraggableComponent id={id}>
          {({ attributes, listeners, style, ref }) => (
            <Card
              elevation={1}
              className="group border border-transparent bg-(--color-background-alt) hover:border-(--color-hover-border) hover:bg-(--color-hover-alt)"
              ref={ref}
              style={style}
              {...attributes}
            >
              <CardContent className="p-4">
                <div className="cardItem">
                  {draggable && <DragIndicatorIcon color="primary" fontSize="small" {...listeners} />}
                  <div className="flex flex-col gap-2">{children}</div>
                  <CardActions className={mergeStyles('ml-auto opacity-0 group-hover:opacity-100', actionsClassName)}>
                    {actions}
                  </CardActions>
                </div>
              </CardContent>
            </Card>
          )}
        </DraggableComponent>
      </Activity>
      <Activity mode={editing ? 'visible' : 'hidden'}>
        <Card elevation={1} className="border border-(--color-hover-border) bg-(--color-hover-alt)">
          <CardContent>{form}</CardContent>
        </Card>
      </Activity>
    </>
  );
};

export default CardListItem;
